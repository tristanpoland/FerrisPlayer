use std::path::PathBuf;

use rocket::fs::NamedFile;
use rocket::http::ContentType;
// backend/src/api/episodes.rs - New file
use rocket::serde::json::Json;
use rocket::State;
use sqlx::{Pool, Sqlite};
use crate::api as api;

use crate::db::models::Episode;
use crate::error::{AppError, Result};

#[get("/<id>")]
pub async fn get_episode(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<Episode>> {
    let episode = sqlx::query_as::<_, Episode>("SELECT * FROM episodes WHERE id = ?")
        .bind(&id)
        .fetch_optional(db.inner())
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("Episode with id {} not found", id)))?;
    
    Ok(Json(episode))
}

#[get("/media/<media_id>")]
pub async fn get_episodes_by_media(media_id: String, db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Episode>>> {
    let episodes = sqlx::query_as::<_, Episode>("SELECT * FROM episodes WHERE media_id = ? ORDER BY season_id, episode_number")
        .bind(&media_id)
        .fetch_all(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    Ok(Json(episodes))
}

#[get("/season/<season_id>")]
pub async fn get_episodes_by_season(season_id: String, db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Episode>>> {
    let episodes = sqlx::query_as::<_, Episode>("SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number")
        .bind(&season_id)
        .fetch_all(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    Ok(Json(episodes))
}

#[get("/<id>/stream")]
pub async fn stream_episode(id: String, db: &State<Pool<Sqlite>>) -> Result<api::media::TypedFile> {
    // Get the episode from the database
    let episode = sqlx::query_as::<_, Episode>("SELECT * FROM episodes WHERE id = ?")
        .bind(&id)
        .fetch_optional(db.inner())
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("Episode with id {} not found", id)))?;

    let path = PathBuf::from(&episode.path);

    // Check file existence and permissions before opening
    match tokio::fs::metadata(&path).await {
        Ok(metadata) => {
            if !metadata.is_file() {
                return Err(AppError::Io(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    format!("Path is not a regular file: {}", path.display()),
                )));
            }
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                return Err(AppError::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("File not found: {}", path.display()),
                )));
            } else if e.kind() == std::io::ErrorKind::PermissionDenied {
                return Err(AppError::Io(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    format!("Access is denied to file: {}", path.display()),
                )));
            } else {
                return Err(AppError::Io(e));
            }
        }
    }

    // Determine content type based on file extension
    let content_type = match path.extension().and_then(|ext| ext.to_str()) {
        None => ContentType::Binary,
        Some("mp4") => ContentType::MP4,
        Some("mkv") => ContentType::new("video", "x-matroska"),
        Some("avi") => ContentType::new("video", "x-msvideo"),
        Some("mov") => ContentType::new("video", "quicktime"),
        Some("mp3") => ContentType::MP3,
        Some("flac") => ContentType::new("audio", "flac"),
        Some("m4a") => ContentType::new("audio", "mp4"),
        _ => ContentType::Binary,
    };

    // Only open the file if permissions are OK
    let file = NamedFile::open(&path).await.map_err(AppError::Io)?;

    Ok(api::media::TypedFile {
        file,
        content_type,
    })
}