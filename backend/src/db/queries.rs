use sqlx::{Pool, Sqlite};
use chrono::Utc;

use crate::db::models::*;
use crate::db::generate_id;
use crate::error::{AppError, Result};

// Media queries
pub async fn get_all_media(pool: &Pool<Sqlite>) -> Result<Vec<Media>> {
    let media = sqlx::query_as::<_, Media>("SELECT * FROM media ORDER BY added_at DESC")
        .fetch_all(pool)
        .await
        .map_err(AppError::Database)?;
    
    Ok(media)
}

pub async fn get_media_by_id(pool: &Pool<Sqlite>, id: &str) -> Result<Media> {
    let media = sqlx::query_as::<_, Media>("SELECT * FROM media WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("Media with id {} not found", id)))?;
    
    Ok(media)
}

pub async fn get_media_by_type(pool: &Pool<Sqlite>, media_type: &str) -> Result<Vec<Media>> {
    let media = sqlx::query_as::<_, Media>("SELECT * FROM media WHERE type = ? ORDER BY title")
        .bind(media_type)
        .fetch_all(pool)
        .await
        .map_err(AppError::Database)?;
    
    Ok(media)
}

// Library queries
pub async fn get_all_libraries(pool: &Pool<Sqlite>) -> Result<Vec<Library>> {
    let libraries = sqlx::query_as::<_, Library>("SELECT * FROM libraries ORDER BY name")
        .fetch_all(pool)
        .await
        .map_err(AppError::Database)?;
    
    Ok(libraries)
}

pub async fn get_library_by_id(pool: &Pool<Sqlite>, id: &str) -> Result<Library> {
    let library = sqlx::query_as::<_, Library>("SELECT * FROM libraries WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("Library with id {} not found", id)))?;
    
    Ok(library)
}

pub async fn create_library(pool: &Pool<Sqlite>, library: CreateLibraryDto) -> Result<Library> {
    let id = generate_id();
    let scan_automatically = library.scan_automatically.unwrap_or(true);
    
    sqlx::query(
        "INSERT INTO libraries (id, name, path, media_type, scan_automatically) 
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&library.name)
    .bind(&library.path)
    .bind(&library.media_type)
    .bind(scan_automatically)
    .execute(pool)
    .await
    .map_err(AppError::Database)?;
    
    let created_library = get_library_by_id(pool, &id).await?;
    Ok(created_library)
}

// Season and Episode queries
pub async fn get_seasons_by_media_id(pool: &Pool<Sqlite>, media_id: &str) -> Result<Vec<Season>> {
    let seasons = sqlx::query_as::<_, Season>(
        "SELECT * FROM seasons WHERE media_id = ? ORDER BY season_number"
    )
    .bind(media_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)?;
    
    Ok(seasons)
}

pub async fn get_episodes_by_season_id(pool: &Pool<Sqlite>, season_id: &str) -> Result<Vec<Episode>> {
    let episodes = sqlx::query_as::<_, Episode>(
        "SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number"
    )
    .bind(season_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)?;
    
    Ok(episodes)
}

// People and Genre queries
pub async fn get_people_by_media_id(pool: &Pool<Sqlite>, media_id: &str) -> Result<Vec<Person>> {
    let people = sqlx::query_as::<_, Person>(
        "SELECT p.* 
         FROM people p
         JOIN media_people mp ON p.id = mp.person_id
         WHERE mp.media_id = ?
         ORDER BY mp.role, p.name"
    )
    .bind(media_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)?;
    
    Ok(people)
}

pub async fn get_genres_by_media_id(pool: &Pool<Sqlite>, media_id: &str) -> Result<Vec<Genre>> {
    let genres = sqlx::query_as::<_, Genre>(
        "SELECT g.* 
         FROM genres g
         JOIN media_genres mg ON g.id = mg.genre_id
         WHERE mg.media_id = ?
         ORDER BY g.name"
    )
    .bind(media_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)?;
    
    Ok(genres)
}

// Watch progress queries
pub async fn get_progress_by_media_id(
    pool: &Pool<Sqlite>, 
    user_id: &str, 
    media_id: &str
) -> Result<Option<WatchProgress>> {
    let progress = sqlx::query_as::<_, WatchProgress>(
        "SELECT * FROM watch_progress 
         WHERE user_id = ? AND media_id = ? 
         ORDER BY watched_at DESC LIMIT 1"
    )
    .bind(user_id)
    .bind(media_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::Database)?;
    
    Ok(progress)
}

pub async fn update_watch_progress(
    pool: &Pool<Sqlite>,
    progress: UpdateProgressDto
) -> Result<WatchProgress> {
    let id = generate_id();
    let completed = progress.completed.unwrap_or(false);
    let now = Utc::now();
    
    sqlx::query(
        "INSERT INTO watch_progress 
         (id, user_id, media_id, episode_id, position, duration, watched_at, completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&progress.user_id)
    .bind(&progress.media_id)
    .bind(&progress.episode_id)
    .bind(progress.position)
    .bind(progress.duration)
    .bind(now)
    .bind(completed)
    .execute(pool)
    .await
    .map_err(AppError::Database)?;
    
    // If completed, update the media entry's last_watched and watch_count
    if completed {
        sqlx::query(
            "UPDATE media 
             SET last_watched = ?, watch_count = watch_count + 1 
             WHERE id = ?"
        )
        .bind(now)
        .bind(&progress.media_id)
        .execute(pool)
        .await
        .map_err(AppError::Database)?;
    }
    
    let created_progress = sqlx::query_as::<_, WatchProgress>(
        "SELECT * FROM watch_progress WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)?;
    
    Ok(created_progress)
}