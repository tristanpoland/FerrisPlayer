use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Media {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub media_type: String, // movie, tvshow, music
    pub year: Option<i32>,
    pub path: String,
    pub is_directory: Option<bool>, // Added field to distinguish directories from files
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub overview: Option<String>,
    pub rating: Option<f64>,
    pub added_at: DateTime<Utc>,
    pub last_watched: Option<DateTime<Utc>>,
    pub watch_count: i32,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Season {
    pub id: String,
    pub media_id: String,
    pub season_number: i32,
    pub title: Option<String>,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Episode {
    pub id: String,
    pub media_id: String,
    pub season_id: String,
    pub episode_number: i32,
    pub title: String,
    pub overview: Option<String>,
    pub path: String,
    pub still_path: Option<String>,
    pub air_date: Option<String>,
    pub runtime: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Person {
    pub id: String,
    pub name: String,
    pub profile_path: Option<String>,
    pub biography: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct MediaPerson {
    pub media_id: String,
    pub person_id: String,
    pub role: String,
    pub character: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Genre {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct MediaGenre {
    pub media_id: String,
    pub genre_id: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Library {
    pub id: String,
    pub name: String,
    pub path: String,
    pub media_type: String,
    pub scan_automatically: bool,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WatchProgress {
    pub id: String,
    pub user_id: String,
    pub media_id: String,
    pub episode_id: Option<String>,
    pub position: i32,
    pub duration: i32,
    pub watched_at: DateTime<Utc>,
    pub completed: bool,
}

// Create DTOs (Data Transfer Objects) for incoming requests

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateLibraryDto {
    pub name: String,
    pub path: String,
    pub media_type: String,
    pub scan_automatically: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProgressDto {
    pub user_id: String,
    pub media_id: String,
    pub episode_id: Option<String>,
    pub position: i32,
    pub duration: i32,
    pub completed: Option<bool>,
}