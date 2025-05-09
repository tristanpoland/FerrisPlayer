use rocket::http::Status;
use rocket::response::{Responder, Response};
use rocket::request::Request;
use rocket::serde::json::{json, Value};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("External API error: {0}")]
    ExternalApi(String),
    
    #[error("Authentication error: {0}")]
    Auth(String),
    
    #[error("Server error: {0}")]
    Server(String),
}

impl<'r> Responder<'r, 'static> for AppError {
    fn respond_to(self, request: &'r Request<'_>) -> rocket::response::Result<'static> {
        let (status, message) = match self {
            AppError::Database(e) => (Status::InternalServerError, e.to_string()),
            AppError::NotFound(msg) => (Status::NotFound, msg),
            AppError::InvalidInput(msg) => (Status::BadRequest, msg),
            AppError::Io(e) => (Status::InternalServerError, e.to_string()),
            AppError::ExternalApi(msg) => (Status::BadGateway, msg),
            AppError::Auth(msg) => (Status::Unauthorized, msg),
            AppError::Server(msg) => (Status::InternalServerError, msg),
        };
        
        let body = json!({
            "status": "error",
            "message": message
        });
        
        Response::build()
            .status(status)
            .sized_body(body.to_string().len(), std::io::Cursor::new(body.to_string()))
            .header(rocket::http::ContentType::JSON)
            .ok()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;