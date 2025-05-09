use rocket::http::{ContentType, Header, Status};
use rocket::serde::json::Json;
use rocket::{State, Response};
use rocket::response::Responder;
use rocket::fs::NamedFile;
use rocket::request::Request;
use sqlx::{Pool, Sqlite, Row};
use std::path::PathBuf;
use std::io::{Read, Seek, SeekFrom};
use std::fs::File;
use std::ops::Range;

use crate::db::models::Media;
use crate::db::queries;
use crate::error::{AppError, Result};

#[get("/")]
pub async fn get_all_media(db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Media>>> {
    let media = queries::get_all_media(db).await?;
    Ok(Json(media))
}

#[get("/info/<id>")]
pub async fn get_media(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<Media>> {
    let media = queries::get_media_by_id(db, &id).await?;
    Ok(Json(media))
}

#[get("/type/<media_type>")]
pub async fn get_media_by_type(media_type: String, db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Media>>> {
    let media = queries::get_media_by_type(db, &media_type).await?;
    Ok(Json(media))
}

// Custom struct for handling range requests with support for seeking
pub struct RangeFile {
    file_path: PathBuf,
    content_type: ContentType,
    file_size: u64,
}

impl RangeFile {
    pub fn new(file_path: PathBuf, content_type: ContentType) -> Result<Self> {
        let metadata = std::fs::metadata(&file_path)
            .map_err(|e| AppError::Io(e))?;
        
        Ok(Self {
            file_path,
            content_type,
            file_size: metadata.len(),
        })
    }
    
    // Parse range header value like "bytes=0-1023"
    fn parse_range_header(range_header: &str, file_size: u64) -> Option<Range<u64>> {
        let bytes_prefix = "bytes=";
        if !range_header.starts_with(bytes_prefix) {
            return None;
        }
        
        let range_str = &range_header[bytes_prefix.len()..];
        let split: Vec<&str> = range_str.split('-').collect();
        if split.len() != 2 {
            return None;
        }
        
        let start = match split[0].parse::<u64>() {
            Ok(s) => s,
            Err(_) => return None,
        };
        
        // Handle ranges like "bytes=1000-" (from 1000 to end)
        let end = if split[1].is_empty() {
            file_size - 1
        } else {
            match split[1].parse::<u64>() {
                Ok(e) => e,
                Err(_) => return None,
            }
        };
        
        // Validate range
        if start > end || start >= file_size {
            return None;
        }
        
        // Ensure end doesn't exceed file size
        let end = std::cmp::min(end, file_size - 1);
        
        Some(start..end + 1) // +1 because Range is exclusive on the end
    }
}

impl<'r> Responder<'r, 'static> for RangeFile {
    fn respond_to(self, req: &'r Request<'_>) -> rocket::response::Result<'static> {
        // Check if we have a range header
        let range_header = req.headers().get_one("Range");
        
        match range_header {
            Some(range_value) => {
                // Parse the range
                if let Some(byte_range) = Self::parse_range_header(range_value, self.file_size) {
                    // Open the file
                    let mut file = match File::open(&self.file_path) {
                        Ok(f) => f,
                        Err(_) => return Err(Status::InternalServerError),
                    };
                    
                    // The length of content we'll return
                    let range_length = byte_range.end - byte_range.start;
                    
                    // Seek to the start position
                    if let Err(_) = file.seek(SeekFrom::Start(byte_range.start)) {
                        return Err(Status::InternalServerError);
                    }
                    
                    // Read the requested bytes
                    let mut buffer = vec![0; range_length as usize];
                    match file.read_exact(&mut buffer) {
                        Ok(_) => (),
                        // If we can't read the exact amount (e.g., EOF), adjust the buffer
                        Err(_) => {
                            // Alternative: read what we can
                            let mut partial_buffer = Vec::new();
                            if let Err(_) = file.read_to_end(&mut partial_buffer) {
                                return Err(Status::InternalServerError);
                            }
                            buffer = partial_buffer;
                        }
                    }
                    
                    // Create the response
                    let actual_length = buffer.len() as u64;
                    let mut response = Response::build()
                        .status(Status::PartialContent)
                        .header(self.content_type.clone())
                        .header(Header::new("Accept-Ranges", "bytes"))
                        .header(Header::new(
                            "Content-Range", 
                            format!("bytes {}-{}/{}", 
                                byte_range.start, 
                                byte_range.start + actual_length - 1, 
                                self.file_size)
                        ))
                        .header(Header::new("Content-Length", actual_length.to_string()))
                        .sized_body(actual_length as usize, std::io::Cursor::new(buffer))
                        .finalize();
                    
                    Ok(response)
                } else {
                    // Invalid range, return 416 Range Not Satisfiable
                    let mut response = Response::build()
                        .status(Status::RangeNotSatisfiable)
                        .header(Header::new("Content-Range", format!("bytes */{}", self.file_size)))
                        .finalize();
                    
                    Ok(response)
                }
            },
            None => {
                // No range header, return the full file with proper headers
                // NOTE: Cannot use async .await here, so fallback to sync file read
                let mut file = match File::open(&self.file_path) {
                    Ok(f) => f,
                    Err(_) => return Err(Status::InternalServerError),
                };
                let mut buffer = Vec::with_capacity(self.file_size as usize);
                if let Err(_) = file.read_to_end(&mut buffer) {
                    return Err(Status::InternalServerError);
                }

                let mut response = Response::build()
                    .status(Status::Ok)
                    .header(self.content_type.clone())
                    .header(Header::new("Accept-Ranges", "bytes"))
                    .header(Header::new("Content-Length", self.file_size.to_string()))
                    .sized_body(buffer.len(), std::io::Cursor::new(buffer))
                    .finalize();

                Ok(response)
            }
        }
    }
}

#[get("/info/<id>/stream?<episode>")]
pub async fn stream_media(id: String, episode: Option<String>, db: &State<Pool<Sqlite>>) -> Result<RangeFile> {
    // Get the media file from the database
    let media = queries::get_media_by_id(db, &id).await?;
    
    // Determine the path based on media type and if episode is provided
    let path = if media.media_type == "tvshow" {
        if let Some(episode_id) = episode {
            // Get the episode path
            let row = sqlx::query("SELECT path FROM episodes WHERE id = ?")
                .bind(&episode_id)
                .fetch_optional(db.inner())
                .await
                .map_err(AppError::Database)?
                .ok_or_else(|| AppError::NotFound(format!("Episode not found: {}", episode_id)))?;
                
            PathBuf::from(row.get::<String, _>("path"))
        } else {
            // No episode specified for a TV show
            return Err(AppError::InvalidInput("Episode ID is required for TV shows".to_string()));
        }
    } else {
        // Regular media file (movie or music)
        PathBuf::from(&media.path)
    };
    
    // Verify the file exists
    if !path.exists() {
        return Err(AppError::NotFound(format!("Media file not found: {:?}", path)));
    }
    
    // Determine content type based on file extension
    let content_type = match path.extension().and_then(|ext| ext.to_str()) {
        Some("mp4") => ContentType::MP4,
        Some("mkv") => ContentType::new("video", "x-matroska"),
        Some("avi") => ContentType::new("video", "x-msvideo"),
        Some("mov") => ContentType::new("video", "quicktime"),
        Some("mp3") => ContentType::MP3,
        Some("flac") => ContentType::new("audio", "flac"),
        Some("m4a") => ContentType::new("audio", "mp4"),
        _ => ContentType::Binary,
    };
    
    // Return the file with support for range requests
    RangeFile::new(path, content_type)
}

// Additional API to get detailed information about a media item
#[get("/info/<id>/details")]
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