use rocket::serde::json::Json;
use rocket::State;
use sqlx::{Pool, Sqlite};
use std::path::Path;
use walkdir::WalkDir;
use std::collections::HashSet;
use chrono::Utc;

use crate::db::models::{Library, CreateLibraryDto};
use crate::db::queries;
use crate::db::generate_id;
use crate::error::{AppError, Result};
use crate::media::scanner;

#[get("/")]
pub async fn get_libraries(db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Library>>> {
    let libraries = queries::get_all_libraries(db).await?;
    Ok(Json(libraries))
}

#[post("/", data = "<library>")]
pub async fn create_library(
    library: Json<CreateLibraryDto>, 
    db: &State<Pool<Sqlite>>
) -> Result<Json<Library>> {
    // Validate the path
    let path = Path::new(&library.path);
    if !path.exists() {
        return Err(AppError::InvalidInput(format!("Path does not exist: {}", library.path)));
    }
    
    if !path.is_dir() {
        return Err(AppError::InvalidInput(format!("Path is not a directory: {}", library.path)));
    }
    
    // Validate the media type
    match library.media_type.as_str() {
        "movie" | "tvshow" | "music" => {},
        _ => return Err(AppError::InvalidInput(
            format!("Invalid media type: {}. Must be 'movie', 'tvshow', or 'music'", library.media_type)
        )),
    }
    
    // Create the library
    let created_library = queries::create_library(db, library.0).await?;
    
    Ok(Json(created_library))
}

#[post("/<id>/scan")]
pub async fn scan_library(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<serde_json::Value>> {
    // Get the library
    let library = queries::get_library_by_id(db, &id).await?;
    
    // Begin scanning
    tracing::info!("Scanning library: {} at path {}", library.name, library.path);
    
    // Scan based on media type
    let result = match library.media_type.as_str() {
        "movie" => scanner::scan_movies(db, &library).await,
        "tvshow" => scanner::scan_tv_shows(db, &library).await,
        "music" => scanner::scan_music(db, &library).await,
        _ => return Err(AppError::InvalidInput(
            format!("Invalid media type: {}. Must be 'movie', 'tvshow', or 'music'", library.media_type)
        )),
    };
    
    match result {
        Ok(scan_results) => Ok(Json(serde_json::json!({
            "success": true,
            "message": format!("Library scan completed for {}", library.name),
            "results": scan_results
        }))),
        Err(e) => Err(e),
    }
}

#[delete("/<id>")]
pub async fn delete_library(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<serde_json::Value>> {
    // Check if the library exists
    let _ = queries::get_library_by_id(db, &id).await?;
    
    // Delete the library
    sqlx::query("DELETE FROM libraries WHERE id = ?")
        .bind(&id)
        .execute(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Library deleted successfully"
    })))
}