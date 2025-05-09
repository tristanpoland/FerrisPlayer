use rocket::http::ContentType;
use rocket::serde::json::Json;
use rocket::{State, Response};
use rocket::response::Responder;
use rocket::fs::NamedFile;
use sqlx::{Pool, Sqlite};
use std::path::PathBuf;

use crate::db::models::Media;
use crate::db::queries;
use crate::error::{AppError, Result};
use tokio::fs::File;
use tokio::io::AsyncReadExt;

#[get("/")]
pub async fn get_all_media(db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Media>>> {
    let media = queries::get_all_media(db).await?;
    Ok(Json(media))
}

#[get("/<id>")]
pub async fn get_media(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<Media>> {
    let media = queries::get_media_by_id(db, &id).await?;
    Ok(Json(media))
}

#[get("/type/<media_type>")]
pub async fn get_media_by_type(media_type: String, db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Media>>> {
    let media = queries::get_media_by_type(db, &media_type).await?;
    Ok(Json(media))
}

// Custom struct to wrap NamedFile with a content type
pub struct TypedFile {
    file: NamedFile,
    content_type: ContentType,
}

impl<'r> Responder<'r, 'static> for TypedFile {
    fn respond_to(self, req: &'r rocket::Request<'_>) -> rocket::response::Result<'static> {
        // Get the response from the underlying NamedFile
        let mut response = self.file.respond_to(req)?;
        
        // Replace the content type
        response.set_header(self.content_type);
        
        Ok(response)
    }
}

#[get("/<id>/stream")]
pub async fn stream_media(id: String, db: &State<Pool<Sqlite>>) -> Result<TypedFile> {
    // Get the media file from the database
    let media = queries::get_media_by_id(db, &id).await?;

    let path = PathBuf::from(&media.path);

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

    Ok(TypedFile {
        file,
        content_type,
    })
}

// Additional API to get detailed information about a media item
#[get("/<id>/details")]
pub async fn get_media_details(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<serde_json::Value>> {
    // Get the media item
    let media = queries::get_media_by_id(db, &id).await?;
    
    // If it's a TV show, get seasons and episodes
    let mut details = serde_json::json!(media);
    
    if media.media_type == "tvshow" {
        // Get seasons
        let seasons = queries::get_seasons_by_media_id(db, &id).await?;
        let mut seasons_with_episodes = Vec::new();
        
        for season in seasons {
            let episodes = queries::get_episodes_by_season_id(db, &season.id).await?;
            let season_with_episodes = serde_json::json!({
                "season": season,
                "episodes": episodes
            });
            seasons_with_episodes.push(season_with_episodes);
        }
        
        details["seasons"] = serde_json::json!(seasons_with_episodes);
    }
    
    // Get people (cast and crew)
    let people = queries::get_people_by_media_id(db, &id).await?;
    details["people"] = serde_json::json!(people);
    
    // Get genres
    let genres = queries::get_genres_by_media_id(db, &id).await?;
    details["genres"] = serde_json::json!(genres);
    
    Ok(Json(details))
}