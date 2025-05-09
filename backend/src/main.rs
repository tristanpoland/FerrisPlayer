#[macro_use] extern crate rocket;

use dotenvy::dotenv;
use rocket::{Rocket, Build};
use rocket::fs::{FileServer, relative};
use rocket::serde::json::{Json, Value, json};
use rocket_cors::{AllowedOrigins, CorsOptions};
use sqlx::sqlite::SqlitePoolOptions;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod db;
mod media;
mod metadata;
mod error;

#[get("/")]
fn index() -> &'static str {
    "MediaRust Server"
}

#[get("/health")]
fn health_check() -> Value {
    json!({
        "status": "online",
        "version": env!("CARGO_PKG_VERSION")
    })
}

#[catch(404)]
fn not_found() -> Value {
    json!({
        "status": "error",
        "reason": "Resource not found"
    })
}

async fn run_migrations(pool: &sqlx::Pool<sqlx::Sqlite>) -> Result<(), sqlx::Error> {
    sqlx::query(include_str!("../migrations/schema.sql"))
        .execute(pool)
        .await?;
    
    Ok(())
}

// Run a migration to add the is_directory field to existing media entries
async fn update_tv_shows_field(pool: &sqlx::Pool<sqlx::Sqlite>) -> Result<(), sqlx::Error> {
    // First check if is_directory column exists
    let has_column = sqlx::query(
        "SELECT 1 FROM pragma_table_info('media') WHERE name = 'is_directory'"
    )
    .fetch_optional(pool)
    .await?;

    if has_column.is_none() {
        tracing::info!("Adding is_directory column to media table");
        // Add the column if it doesn't exist
        sqlx::query("ALTER TABLE media ADD COLUMN is_directory BOOLEAN DEFAULT 0")
            .execute(pool)
            .await?;
    }

    // Update TV shows to have is_directory = 1
    sqlx::query("UPDATE media SET is_directory = 1 WHERE type = 'tvshow'")
        .execute(pool)
        .await?;

    Ok(())
}

#[launch]
async fn rocket() -> Rocket<Build> {
    // Initialize environment variables
    dotenv().ok();

    // Connect to SQLite database, create if not found
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    if !std::path::Path::new(&database_url).exists() {
        // Create the file if it doesn't exist
        std::fs::File::create(&database_url).expect("Failed to create SQLite database file");
    }
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");
    
    // Run database migrations
    run_migrations(&pool)
        .await
        .expect("Failed to run database migrations");
    
    tracing::info!("Database connected and migrations applied");
    
    // Configure CORS
    let cors = CorsOptions::default()
        .allowed_origins(AllowedOrigins::all())
        .allowed_methods(
            vec!["Get", "Post", "Put", "Delete"]
                .into_iter()
                .map(|s| s.parse().unwrap())
                .collect()
        )
        .allow_credentials(true)
        .to_cors()
        .expect("CORS configuration error");
    
    // Build the Rocket instance
    rocket::build()
        .mount("/", routes![index, health_check])
        .mount("/api/media", routes![
            api::media::get_all_media,
            api::media::get_media,
            api::media::get_media_by_type,
            api::media::stream_media,
            api::media::get_media_details,
        ])
        .mount("/api/libraries", routes![
            api::library::get_libraries,
            api::library::create_library,
            api::library::scan_library,
            api::library::delete_library,
        ])
        .mount("/api/metadata", routes![
            api::metadata::search_external,
            api::metadata::refresh_metadata,
        ])
        .mount("/api/progress", routes![
            api::progress::update_progress,
            api::progress::get_progress,
            api::progress::delete_progress,
            api::progress::get_watch_history,
        ])
        .mount("/api/episodes", routes![
            api::episodes::get_episode,
            api::episodes::get_episodes_by_media,
            api::episodes::get_episodes_by_season,
            api::episodes::stream_episode,
        ])
        .register("/", catchers![not_found])
        .manage(pool)
        .attach(cors)
}