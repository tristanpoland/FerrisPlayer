use std::path::PathBuf;
use std::io::{Read, Seek, SeekFrom};
use std::fs::File;
use std::ops::Range;

use rocket::fs::NamedFile;
use rocket::http::{ContentType, Header, Status};
use rocket::serde::json::Json;
use rocket::State;
use rocket::response::Responder;
use rocket::{Request, Response};
use sqlx::{Pool, Sqlite};

use crate::db::models::Episode;
use crate::error::{AppError, Result};

#[get("/<id>")]
pub async fn get_episode(id: String, db: &State<Pool<Sqlite>>) -> Result<Json<Episode>> {
    let episode = sqlx::query_as::<_, Episode>("SELECT * FROM episodes WHERE id = ?")
        .bind(&id)
        .fetch_optional(db.inner())
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("Episode with id {} not found", id)))?;
    
    Ok(Json(episode))
}

#[get("/media/<media_id>")]
pub async fn get_episodes_by_media(media_id: String, db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Episode>>> {
    let episodes = sqlx::query_as::<_, Episode>("SELECT * FROM episodes WHERE media_id = ? ORDER BY season_id, episode_number")
        .bind(&media_id)
        .fetch_all(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    Ok(Json(episodes))
}

#[get("/season/<season_id>")]
pub async fn get_episodes_by_season(season_id: String, db: &State<Pool<Sqlite>>) -> Result<Json<Vec<Episode>>> {
    let episodes = sqlx::query_as::<_, Episode>("SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number")
        .bind(&season_id)
        .fetch_all(db.inner())
        .await
        .map_err(AppError::Database)?;
    
    Ok(Json(episodes))
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
                    let response = Response::build()
                        .status(Status::PartialContent)
                        .header(self.content_type.clone())
                        .header(Header::new("Accept-Ranges", "bytes"))
                        .header(Header::new(
                            "Content-Range",
                            format!(
                                "bytes {}-{}/{}",
                                byte_range.start,
                                byte_range.start + actual_length - 1,
                                self.file_size
                            ),
                        ))
                        .header(Header::new("Content-Length", actual_length.to_string()))
                        .sized_body(actual_length as usize, std::io::Cursor::new(buffer))
                        .finalize();

                    Ok(response)
                } else {
                    // Invalid range, return 416 Range Not Satisfiable
                    let response = Response::build()
                        .status(Status::RangeNotSatisfiable)
                        .header(Header::new("Content-Range", format!("bytes */{}", self.file_size)))
                        .finalize();

                    Ok(response)
                }
            }
            None => {
                // No range header, return the full file with proper headers
                let file = File::open(&self.file_path);
                match file {
                    Ok(mut file) => {
                        let mut buffer = Vec::with_capacity(self.file_size as usize);
                        if let Err(_) = file.read_to_end(&mut buffer) {
                            return Err(Status::InternalServerError);
                        }
                        let response = Response::build()
                            .status(Status::Ok)
                            .header(self.content_type)
                            .header(Header::new("Accept-Ranges", "bytes"))
                            .header(Header::new("Content-Length", self.file_size.to_string()))
                            .sized_body(buffer.len(), std::io::Cursor::new(buffer))
                            .finalize();

                        Ok(response)
                    }
                    Err(_) => Err(Status::InternalServerError),
                }
            }
        }
    }
}

#[get("/stream/<id>")]
pub async fn stream_episode(id: String, db: &State<Pool<Sqlite>>) -> Result<RangeFile> {
    // Get the episode from the database
    let episode = sqlx::query_as::<_, Episode>("SELECT * FROM episodes WHERE id = ?")
        .bind(&id)
        .fetch_optional(db.inner())
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("Episode with id {} not found", id)))?;

    let path = PathBuf::from(&episode.path);

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

    // Return the file with support for range requests
    RangeFile::new(path, content_type)
}