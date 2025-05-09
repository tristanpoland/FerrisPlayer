use sqlx::{Pool, Sqlite};
use uuid::Uuid;

pub mod models;
pub mod queries;

// Generate a new UUID for database IDs
pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

// Initialize the database with required tables
pub async fn init_db(pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
    // Check if the media table exists
    let result = sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='media'")
        .fetch_optional(pool)
        .await?;
    
    // If the table doesn't exist, run the migration
    if result.is_none() {
        sqlx::query(include_str!("../../migrations/schema.sql"))
            .execute(pool)
            .await?;
        
        tracing::info!("Database schema initialized");
    }
    
    Ok(())
}