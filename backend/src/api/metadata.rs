use rocket::serde::json::Json;
use rocket::State;
use sqlx::{Pool, Sqlite};
use sqlx::Row;

use crate::db::models::Media;
use crate::db::queries;
use crate::db::generate_id;
use crate::error::{AppError, Result};
use crate::metadata::tmdb::{TmdbClient};

#[get("/search?<query>")]
pub async fn search_external(query: &str) -> Result<Json<serde_json::Value>> {
    let tmdb_client = TmdbClient::new()?;
    let search_results = tmdb_client.search(query).await?;
    
    // Format results with full image URLs
    let formatted_results: Vec<serde_json::Value> = search_results.results
        .iter()
        .map(|item| {
            let media_type = item.media_type.as_deref().unwrap_or("unknown");
            let title = if media_type == "tv" { 
                item.name.clone().unwrap_or_default() 
            } else { 
                item.title.clone().unwrap_or_default() 
            };
            
            let poster_url = item.poster_path.as_deref()
                .map(|p| tmdb_client.get_poster_url(p, "w300"))
                .unwrap_or_default();
                
            let backdrop_url = item.backdrop_path.as_deref()
                .map(|p| tmdb_client.get_backdrop_url(p, "w1280"))
                .unwrap_or_default();
                
            serde_json::json!({
                "id": item.id,
                "title": title,
                "overview": item.overview,
                "posterUrl": poster_url,
                "backdropUrl": backdrop_url,
                "year": if media_type == "tv" {
                    item.first_air_date.as_deref().and_then(|d| d.split('-').next()).unwrap_or("")
                } else {
                    item.release_date.as_deref().and_then(|d| d.split('-').next()).unwrap_or("")
                },
                "rating": item.vote_average,
                "mediaType": media_type
            })
        })
        .collect();
    
    Ok(Json(serde_json::json!({
        "results": formatted_results,
        "totalResults": search_results.total_results,
        "totalPages": search_results.total_pages,
        "page": search_results.page
    })))
}

#[post("/refresh/<id>")]
pub async fn refresh_metadata(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<serde_json::Value>> {
    // Get the media item
    let media = queries::get_media_by_id(db, &id).await?;
    
    // Create TMDB client
    let tmdb_client = TmdbClient::new()?;
    
    match media.media_type.as_str() {
        "movie" => refresh_movie_metadata(&tmdb_client, db, &media).await,
        "tvshow" => refresh_tvshow_metadata(&tmdb_client, db, &media).await,
        _ => Err(AppError::InvalidInput(format!("Unsupported media type: {}", media.media_type))),
    }
}

async fn refresh_movie_metadata(
    tmdb_client: &TmdbClient, 
    db: &State<Pool<Sqlite>>, 
    media: &Media
) -> Result<Json<serde_json::Value>> {
    // First, search for the movie
    let search_results = tmdb_client.search(&media.title).await?;
    
    if search_results.results.is_empty() {
        return Err(AppError::NotFound(format!("No metadata found for movie: {}", media.title)));
    }
    
    // Choose the first movie result
    let movie_result = search_results.results.iter()
        .find(|item| item.media_type.as_deref() == Some("movie"))
        .ok_or_else(|| AppError::NotFound(format!("No movie found for: {}", media.title)))?;
    
    // Get detailed movie information
    let movie_details = tmdb_client.get_movie(movie_result.id).await?;
    
    // Update the media record with metadata
    let poster_path = movie_details.poster_path.as_deref()
        .map(|p| tmdb_client.get_poster_url(p, "original"));
    let backdrop_path = movie_details.backdrop_path.as_deref()
        .map(|p| tmdb_client.get_backdrop_url(p, "original"));
    let year = movie_details.release_date.as_deref()
        .and_then(|d| d.split('-').next().map(|y| y.parse::<i32>().unwrap_or(0)));

    sqlx::query("UPDATE media SET poster_path = ?, backdrop_path = ?, overview = ?, rating = ?, year = ? WHERE id = ?")
        .bind(poster_path)
        .bind(backdrop_path)
        .bind(&movie_details.overview)
        .bind(movie_details.vote_average)
        .bind(year)
        .bind(&media.id)
        .execute(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    // Add genres
    for genre in &movie_details.genres {
        // Check if genre exists
        let genre_row = sqlx::query("SELECT id FROM genres WHERE name = ?")
            .bind(&genre.name)
            .fetch_optional(db.inner())
            .await
            .map_err(AppError::Database)?;
        
        let genre_id = if let Some(row) = genre_row {
            row.get::<String, _>("id")
        } else {
            // Create new genre
            let id = generate_id();
            sqlx::query("INSERT INTO genres (id, name) VALUES (?, ?)")
                .bind(&id)
                .bind(&genre.name)
                .execute(db.inner())
                .await
                .map_err(AppError::Database)?;
            
            id
        };
        
        // Add genre relation (ignore if already exists)
        sqlx::query("INSERT OR IGNORE INTO media_genres (media_id, genre_id) VALUES (?, ?)")
            .bind(&media.id)
            .bind(&genre_id)
            .execute(db.inner())
            .await
            .map_err(AppError::Database)?;
    }
    
    // Add cast and crew
    if let Some(credits) = &movie_details.credits {
        // Add cast (limit to top 10)
        for cast in credits.cast.iter().take(10) {
            // Check if person exists
            let person_row = sqlx::query("SELECT id FROM people WHERE name = ?")
                .bind(&cast.name)
                .fetch_optional(db.inner())
                .await
                .map_err(AppError::Database)?;
            
            let person_id = if let Some(row) = person_row {
                row.get::<String, _>("id")
            } else {
                // Create new person
                let id = generate_id();
                let profile_url = cast.profile_path.as_deref()
                    .map(|p| tmdb_client.get_profile_url(p, "original"));
                
                sqlx::query("INSERT INTO people (id, name, profile_path) VALUES (?, ?, ?)")
                    .bind(&id)
                    .bind(&cast.name)
                    .bind(profile_url)
                    .execute(db.inner())
                    .await
                    .map_err(AppError::Database)?;
                
                id
            };
            
            // Add media-person relation
            sqlx::query("INSERT OR REPLACE INTO media_people (media_id, person_id, role, character) VALUES (?, ?, ?, ?)")
                .bind(&media.id)
                .bind(&person_id)
                .bind("actor")
                .bind(&cast.character)
                .execute(db.inner())
                .await
                .map_err(AppError::Database)?;
        }
        
        // Add director and writer
        for crew in &credits.crew {
            if crew.job == "Director" || crew.job == "Writer" {
                // Check if person exists
                let person_row = sqlx::query("SELECT id FROM people WHERE name = ?")
                    .bind(&crew.name)
                    .fetch_optional(db.inner())
                    .await
                    .map_err(AppError::Database)?;
                
                let person_id = if let Some(row) = person_row {
                    row.get::<String, _>("id")
                } else {
                    // Create new person
                    let id = generate_id();
                    let profile_url = crew.profile_path.as_deref()
                        .map(|p| tmdb_client.get_profile_url(p, "original"));
                    
                    sqlx::query("INSERT INTO people (id, name, profile_path) VALUES (?, ?, ?)")
                        .bind(&id)
                        .bind(&crew.name)
                        .bind(profile_url)
                        .execute(db.inner())
                        .await
                        .map_err(AppError::Database)?;
                    
                    id
                };
                
                // Add media-person relation
                let role = if crew.job == "Director" { "director" } else { "writer" };
                
                sqlx::query("INSERT OR REPLACE INTO media_people (media_id, person_id, role, character) VALUES (?, ?, ?, NULL)")
                    .bind(&media.id)
                    .bind(&person_id)
                    .bind(role)
                    .execute(db.inner())
                    .await
                    .map_err(AppError::Database)?;
            }
        }
    }
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Movie metadata updated successfully",
        "mediaId": media.id,
        "title": media.title
    })))
}

async fn refresh_tvshow_metadata(
    tmdb_client: &TmdbClient, 
    db: &State<Pool<Sqlite>>, 
    media: &Media
) -> Result<Json<serde_json::Value>> {
    // First, search for the TV show
    let search_results = tmdb_client.search(&media.title).await?;
    
    if search_results.results.is_empty() {
        return Err(AppError::NotFound(format!("No metadata found for TV show: {}", media.title)));
    }
    
    // Choose the first TV show result
    let tv_result = search_results.results.iter()
        .find(|item| item.media_type.as_deref() == Some("tv"))
        .ok_or_else(|| AppError::NotFound(format!("No TV show found for: {}", media.title)))?;
    
    // Get detailed TV show information
    let tv_details = tmdb_client.get_tv(tv_result.id).await?;
    
    // Update the media record with metadata
    let poster_path = tv_details.poster_path.as_deref()
        .map(|p| tmdb_client.get_poster_url(p, "original"));
    let backdrop_path = tv_details.backdrop_path.as_deref()
        .map(|p| tmdb_client.get_backdrop_url(p, "original"));
    let year = tv_details.first_air_date.as_deref()
        .and_then(|d| d.split('-').next().map(|y| y.parse::<i32>().unwrap_or(0)));

    sqlx::query("UPDATE media SET poster_path = ?, backdrop_path = ?, overview = ?, rating = ?, year = ? WHERE id = ?")
        .bind(poster_path)
        .bind(backdrop_path)
        .bind(&tv_details.overview)
        .bind(tv_details.vote_average)
        .bind(year)
        .bind(&media.id)
        .execute(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    // Add genres
    for genre in &tv_details.genres {
        // Check if genre exists
        let genre_row = sqlx::query("SELECT id FROM genres WHERE name = ?")
            .bind(&genre.name)
            .fetch_optional(db.inner())
            .await
            .map_err(AppError::Database)?;
        
        let genre_id = if let Some(row) = genre_row {
            row.get::<String, _>("id")
        } else {
            // Create new genre
            let id = generate_id();
            sqlx::query("INSERT INTO genres (id, name) VALUES (?, ?)")
                .bind(&id)
                .bind(&genre.name)
                .execute(db.inner())
                .await
                .map_err(AppError::Database)?;
            
            id
        };
        
        // Add genre relation (ignore if already exists)
        sqlx::query("INSERT OR IGNORE INTO media_genres (media_id, genre_id) VALUES (?, ?)")
            .bind(&media.id)
            .bind(&genre_id)
            .execute(db.inner())
            .await
            .map_err(AppError::Database)?;
    }
    
    // Update seasons and episodes metadata
    let seasons = queries::get_seasons_by_media_id(db, &media.id).await?;
    
    for season in seasons {
        // Get season metadata from TMDB
        if let Ok(season_details) = tmdb_client.get_season(tv_result.id, season.season_number).await {
            // Update season info
            let poster_path = season_details.poster_path.as_deref()
                .map(|p| tmdb_client.get_poster_url(p, "original"));

            sqlx::query("UPDATE seasons SET title = ?, overview = ?, poster_path = ? WHERE id = ?")
                .bind(&season_details.name)
                .bind(&season_details.overview)
                .bind(poster_path)
                .bind(&season.id)
                .execute(db.inner())
                .await
                .map_err(AppError::Database)?;
            
            // Update episodes
            let episodes = queries::get_episodes_by_season_id(db, &season.id).await?;
            
            for episode in episodes {
                // Find matching episode in TMDB results
                if let Some(ep_details) = season_details.episodes.iter()
                    .find(|e| e.episode_number == episode.episode_number) {
                    
                    let still_path = ep_details.still_path.as_deref()
                        .map(|p| tmdb_client.get_profile_url(p, "original"));

                    sqlx::query("UPDATE episodes SET title = ?, overview = ?, still_path = ?, air_date = ?, runtime = ? WHERE id = ?")
                        .bind(&ep_details.name)
                        .bind(&ep_details.overview)
                        .bind(still_path)
                        .bind(&ep_details.air_date)
                        .bind(ep_details.runtime)
                        .bind(&episode.id)
                        .execute(db.inner())
                        .await
                        .map_err(AppError::Database)?;
                }
            }
        }
    }
    
    // Add cast and crew
    if let Some(credits) = &tv_details.credits {
        // Add cast (limit to top 10)
        for cast in credits.cast.iter().take(10) {
            // Check if person exists
            let person_row = sqlx::query("SELECT id FROM people WHERE name = ?")
                .bind(&cast.name)
                .fetch_optional(db.inner())
                .await
                .map_err(AppError::Database)?;
            
            let person_id = if let Some(row) = person_row {
                row.get::<String, _>("id")
            } else {
                // Create new person
                let id = generate_id();
                let profile_url = cast.profile_path.as_deref()
                    .map(|p| tmdb_client.get_profile_url(p, "original"));
                
                sqlx::query("INSERT INTO people (id, name, profile_path) VALUES (?, ?, ?)")
                    .bind(&id)
                    .bind(&cast.name)
                    .bind(profile_url)
                    .execute(db.inner())
                    .await
                    .map_err(AppError::Database)?;
                
                id
            };
            
            // Add media-person relation
            sqlx::query("INSERT OR REPLACE INTO media_people (media_id, person_id, role, character) VALUES (?, ?, ?, ?)")
                .bind(&media.id)
                .bind(&person_id)
                .bind("actor")
                .bind(&cast.character)
                .execute(db.inner())
                .await
                .map_err(AppError::Database)?;
        }
        
        // Add creator
        for crew in &credits.crew {
            if crew.job == "Creator" || crew.job == "Executive Producer" {
                // Check if person exists
                let person_row = sqlx::query("SELECT id FROM people WHERE name = ?")
                    .bind(&crew.name)
                    .fetch_optional(db.inner())
                    .await
                    .map_err(AppError::Database)?;
                
                let person_id = if let Some(row) = person_row {
                    row.get::<String, _>("id")
                } else {
                    // Create new person
                    let id = generate_id();
                    let profile_url = crew.profile_path.as_deref()
                        .map(|p| tmdb_client.get_profile_url(p, "original"));
                    
                    sqlx::query("INSERT INTO people (id, name, profile_path) VALUES (?, ?, ?)")
                        .bind(&id)
                        .bind(&crew.name)
                        .bind(profile_url)
                        .execute(db.inner())
                        .await
                        .map_err(AppError::Database)?;
                    
                    id
                };
                
                // Add media-person relation
                let role = if crew.job == "Creator" { "creator" } else { "producer" };
                
                sqlx::query("INSERT OR REPLACE INTO media_people (media_id, person_id, role, character) VALUES (?, ?, ?, NULL)")
                    .bind(&media.id)
                    .bind(&person_id)
                    .bind(role)
                    .execute(db.inner())
                    .await
                    .map_err(AppError::Database)?;
            }
        }
    }
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "TV show metadata updated successfully",
        "mediaId": media.id,
        "title": media.title
    })))
}