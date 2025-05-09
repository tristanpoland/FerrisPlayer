use rocket::serde::json::Json;
use rocket::State;
use sqlx::{Pool, Sqlite, Row};

use crate::db::models::{WatchProgress, UpdateProgressDto};
use crate::db::queries;
use crate::error::{AppError, Result};

#[get("/<media_id>?<user_id>")]
pub async fn get_progress(
    media_id: String,
    user_id: String,
    db: &State<Pool<Sqlite>>
) -> Result<Json<Option<WatchProgress>>> {
    let progress = queries::get_progress_by_media_id(db, &user_id, &media_id).await?;
    Ok(Json(progress))
}

#[post("/", data = "<progress>")]
pub async fn update_progress(
    progress: Json<UpdateProgressDto>,
    db: &State<Pool<Sqlite>>
) -> Result<Json<WatchProgress>> {
    // Validate required fields
    if progress.user_id.is_empty() {
        return Err(AppError::InvalidInput("user_id is required".to_string()));
    }
    
    if progress.media_id.is_empty() {
        return Err(AppError::InvalidInput("media_id is required".to_string()));
    }
    
    if progress.position < 0 {
        return Err(AppError::InvalidInput("position must be non-negative".to_string()));
    }
    
    if progress.duration <= 0 {
        return Err(AppError::InvalidInput("duration must be positive".to_string()));
    }
    
    // Calculate if it's completed (if not specified)
    let progress_data = if progress.completed.is_none() {
        let completed = progress.position as f32 / progress.duration as f32 > 0.9; // Mark as completed if watched more than 90%
        UpdateProgressDto {
            completed: Some(completed),
            ..progress.0
        }
    } else {
        progress.0
    };
    
    let updated_progress = queries::update_watch_progress(db, progress_data).await?;
    Ok(Json(updated_progress))
}

#[delete("/<id>")]
pub async fn delete_progress(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<serde_json::Value>> {
    // Delete the progress entry
    sqlx::query("DELETE FROM watch_progress WHERE id = ?")
        .bind(&id)
        .execute(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Watch progress deleted successfully"
    })))
}

#[get("/user/<user_id>/history")]
pub async fn get_watch_history(
    user_id: String,
    db: &State<Pool<Sqlite>>
) -> Result<Json<Vec<serde_json::Value>>> {
    // Get watch history with media details
    let query = r#"
        SELECT wp.id, wp.media_id, wp.episode_id, wp.position, wp.duration, wp.watched_at, wp.completed,
               m.title as media_title, m.poster_path, m.type as media_type,
               e.title as episode_title, e.episode_number, 
               s.season_number
        FROM watch_progress wp
        JOIN media m ON wp.media_id = m.id
        LEFT JOIN episodes e ON wp.episode_id = e.id
        LEFT JOIN seasons s ON e.season_id = s.id
        WHERE wp.user_id = ?
        ORDER BY wp.watched_at DESC
        LIMIT 50
    "#;
    
    let rows = sqlx::query(query)
        .bind(&user_id)
        .fetch_all(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    let history_with_details: Vec<serde_json::Value> = rows
        .iter()
        .map(|row| {
            // Create a formatted watch history entry
            serde_json::json!({
                "id": row.get::<String, _>("id"),
                "mediaId": row.get::<String, _>("media_id"),
                "mediaTitle": row.get::<String, _>("media_title"),
                "mediaType": row.get::<String, _>("media_type"),
                "posterPath": row.get::<Option<String>, _>("poster_path"),
                "episodeId": row.get::<Option<String>, _>("episode_id"),
                "episodeTitle": row.get::<Option<String>, _>("episode_title"),
                "episodeNumber": row.get::<Option<i32>, _>("episode_number"),
                "seasonNumber": row.get::<Option<i32>, _>("season_number"),
                "position": row.get::<i32, _>("position"),
                "duration": row.get::<i32, _>("duration"),
                "watchedAt": row.get::<chrono::DateTime<chrono::Utc>, _>("watched_at"),
                "completed": row.get::<i32, _>("completed") != 0
            })
        })
        .collect();
    
    Ok(Json(history_with_details))
}