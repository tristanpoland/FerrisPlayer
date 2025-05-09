use sqlx::{Pool, Sqlite, Row};
use walkdir::WalkDir;
use std::path::{Path};
use std::collections::HashSet;
use chrono::Utc;
use std::ffi::OsStr;

use crate::db::models::Library;
use crate::db::generate_id;
use crate::error::{AppError, Result};

// Video file extensions
const VIDEO_EXTENSIONS: [&str; 10] = [
    "mp4", "mkv", "avi", "mov", "wmv", "m4v", "mpg", "mpeg", "flv", "webm"
];

// Audio file extensions
const AUDIO_EXTENSIONS: [&str; 8] = [
    "mp3", "flac", "m4a", "wav", "ogg", "aac", "wma", "aiff"
];

pub async fn scan_movies(db: &Pool<Sqlite>, library: &Library) -> Result<serde_json::Value> {
    let mut added_count = 0;
    let mut existing_count = 0;
    let library_path = Path::new(&library.path);
    
    // Get existing media paths in this library
    let path_pattern = format!("{}%", library.path);
    let existing_rows = sqlx::query("SELECT path FROM media WHERE path LIKE ? AND type = 'movie'")
        .bind(&path_pattern)
        .fetch_all(db)
        .await
        .map_err(AppError::Database)?;
    
    let existing_paths: HashSet<String> = existing_rows
        .iter()
        .map(|row| row.get::<String, _>("path"))
        .collect();
    
    // Find all video files in the library
    for entry in WalkDir::new(library_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        // Check if it's a video file
        if path.is_file() && is_video_file(path) {
            let path_str = path.to_string_lossy().to_string();
            
            // Skip if already in database
            if existing_paths.contains(&path_str) {
                existing_count += 1;
                continue;
            }
            
            // Extract movie info from path
            if let Some(title) = extract_movie_title(path) {
                let year = extract_year_from_filename(path);
                
                // Add to database
                let id = generate_id();
                let now = Utc::now();
                
                sqlx::query(
                    "INSERT INTO media (id, title, type, year, path, added_at, watch_count) 
                     VALUES (?, ?, ?, ?, ?, ?, 0)"
                )
                .bind(&id)
                .bind(&title)
                .bind("movie")
                .bind(year)
                .bind(&path_str)
                .bind(now)
                .execute(db)
                .await
                .map_err(AppError::Database)?;
                
                added_count += 1;
                tracing::info!("Added movie: {} ({})", title, path_str);
            }
        }
    }
    
    Ok(serde_json::json!({
        "added": added_count,
        "existing": existing_count,
        "libraryId": library.id,
        "libraryName": library.name
    }))
}

pub async fn scan_tv_shows(db: &Pool<Sqlite>, library: &Library) -> Result<serde_json::Value> {
    let mut added_shows = 0;
    let mut added_seasons = 0;
    let mut added_episodes = 0;
    let mut existing_episodes = 0;
    
    let library_path = Path::new(&library.path);
    
    // Get existing TV episode paths
    let path_pattern = format!("{}%", library.path);
    let existing_rows = sqlx::query("SELECT path FROM episodes WHERE path LIKE ?")
        .bind(&path_pattern)
        .fetch_all(db)
        .await
        .map_err(AppError::Database)?;
    
    let existing_paths: HashSet<String> = existing_rows
        .iter()
        .map(|row| row.get::<String, _>("path"))
        .collect();
    
    // Map to track TV shows we've already processed
    let mut processed_shows: HashSet<String> = HashSet::new();
    
    // Find all video files in the library
    for entry in WalkDir::new(library_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        // Check if it's a video file
        if path.is_file() && is_video_file(path) {
            let path_str = path.to_string_lossy().to_string();
            
            // Skip if already in database
            if existing_paths.contains(&path_str) {
                existing_episodes += 1;
                continue;
            }
            
            // Try to parse as a TV episode
            if let Some((show_title, season_num, episode_num)) = extract_tv_info(path) {
                // Check if we already have this show
                let show_path = path.parent().unwrap().parent().unwrap().to_string_lossy().to_string();
                
                let show_id = if !processed_shows.contains(&show_title) {
                    // Create new show
                    let id = generate_id();
                    let now = Utc::now();
                    
                    sqlx::query(
                        "INSERT INTO media (id, title, type, path, added_at, watch_count) 
                         VALUES (?, ?, ?, ?, ?, 0)"
                    )
                    .bind(&id)
                    .bind(&show_title)
                    .bind("tvshow")
                    .bind(&show_path)
                    .bind(now)
                    .execute(db)
                    .await
                    .map_err(AppError::Database)?;
                    
                    processed_shows.insert(show_title.clone());
                    added_shows += 1;
                    tracing::info!("Added TV show: {}", show_title);
                    
                    id
                } else {
                    // Get existing show ID
                    let row = sqlx::query("SELECT id FROM media WHERE title = ? AND type = 'tvshow'")
                        .bind(&show_title)
                        .fetch_one(db)
                        .await
                        .map_err(AppError::Database)?;
                    
                    row.get::<String, _>("id")
                };
                
                // Check if we already have this season
                let season_row = sqlx::query(
                    "SELECT id FROM seasons WHERE media_id = ? AND season_number = ?"
                )
                .bind(&show_id)
                .bind(season_num)
                .fetch_optional(db)
                .await
                .map_err(AppError::Database)?;
                
                let season_id = if let Some(row) = season_row {
                    row.get::<String, _>("id")
                } else {
                    // Create new season
                    let id = generate_id();
                    let season_title = format!("Season {}", season_num);
                    
                    sqlx::query(
                        "INSERT INTO seasons (id, media_id, season_number, title) 
                         VALUES (?, ?, ?, ?)"
                    )
                    .bind(&id)
                    .bind(&show_id)
                    .bind(season_num)
                    .bind(&season_title)
                    .execute(db)
                    .await
                    .map_err(AppError::Database)?;
                    
                    added_seasons += 1;
                    tracing::info!("Added season {} for show {}", season_num, show_title);
                    
                    id
                };
                
                // Create episode
                let episode_id = generate_id();
                let episode_title = format!("Episode {}", episode_num);
                
                sqlx::query(
                    "INSERT INTO episodes (id, media_id, season_id, episode_number, title, path) 
                     VALUES (?, ?, ?, ?, ?, ?)"
                )
                .bind(&episode_id)
                .bind(&show_id)
                .bind(&season_id)
                .bind(episode_num)
                .bind(&episode_title)
                .bind(&path_str)
                .execute(db)
                .await
                .map_err(AppError::Database)?;
                
                added_episodes += 1;
                tracing::info!("Added episode {} for show {} season {}", episode_num, show_title, season_num);
            }
        }
    }
    
    Ok(serde_json::json!({
        "addedShows": added_shows,
        "addedSeasons": added_seasons,
        "addedEpisodes": added_episodes,
        "existingEpisodes": existing_episodes,
        "libraryId": library.id,
        "libraryName": library.name
    }))
}

pub async fn scan_music(db: &Pool<Sqlite>, library: &Library) -> Result<serde_json::Value> {
    // Implement music scanning logic here
    Ok(serde_json::json!({
        "message": "Music scanning not yet implemented",
        "libraryId": library.id,
        "libraryName": library.name
    }))
}

// Helper functions

fn is_video_file(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(OsStr::to_str) {
        VIDEO_EXTENSIONS.contains(&ext.to_lowercase().as_str())
    } else {
        false
    }
}

fn is_audio_file(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(OsStr::to_str) {
        AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str())
    } else {
        false
    }
}

fn extract_movie_title(path: &Path) -> Option<String> {
    path.file_stem()
        .and_then(OsStr::to_str)
        .map(|name| {
            // Remove year if present (e.g., "Movie Title (2020)" -> "Movie Title")
            if let Some(idx) = name.rfind('(') {
                let title = &name[0..idx];
                title.trim().to_string()
            } else {
                name.trim().to_string()
            }
        })
}

fn extract_year_from_filename(path: &Path) -> Option<i32> {
    path.file_stem()
        .and_then(OsStr::to_str)
        .and_then(|name| {
            // Try to find a pattern like "(2020)" in the filename
            let start = name.rfind('(')?;
            let end = name.rfind(')')?;
            if start < end && end - start == 5 {
                let year_str = &name[start + 1..end];
                year_str.parse::<i32>().ok()
            } else {
                None
            }
        })
}

fn extract_tv_info(path: &Path) -> Option<(String, i32, i32)> {
    // Try to parse common TV show patterns like:
    // - Show Name/Season 01/Show Name S01E02.mp4
    // - Show Name/Season 1/Episode 02.mp4
    
    let file_name = path.file_name()?.to_str()?;
    let parent = path.parent()?;
    let parent_name = parent.file_name()?.to_str()?;
    let show_dir = parent.parent()?;
    let show_name = show_dir.file_name()?.to_str()?;
    
    // Check if parent folder is a season folder
    let season_num = if parent_name.to_lowercase().contains("season") {
        // Extract season number
        parent_name
            .chars()
            .filter(|c| c.is_digit(10))
            .collect::<String>()
            .parse::<i32>()
            .ok()?
    } else {
        return None;
    };
    
    // Try to find episode number
    let episode_num = if file_name.to_lowercase().contains('e') {
        // Try to match SxxEyy pattern
        let e_pos = file_name.to_lowercase().find('e')?;
        file_name[e_pos+1..]
            .chars()
            .take_while(|c| c.is_digit(10))
            .collect::<String>()
            .parse::<i32>()
            .ok()?
    } else if file_name.to_lowercase().contains("episode") {
        // Try to match "Episode xx" pattern
        file_name
            .to_lowercase()
            .find("episode")?;
        file_name
            .chars()
            .filter(|c| c.is_digit(10))
            .collect::<String>()
            .parse::<i32>()
            .ok()?
    } else {
        return None;
    };
    
    Some((show_name.to_string(), season_num, episode_num))
}