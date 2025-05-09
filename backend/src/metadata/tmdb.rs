use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

use crate::error::{AppError, Result};

const TMDB_API_URL: &str = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL: &str = "https://image.tmdb.org/t/p";

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbSearchResult {
    pub results: Vec<TmdbMedia>,
    pub total_results: i32,
    pub total_pages: i32,
    pub page: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbMedia {
    pub id: i32,
    pub title: Option<String>,
    pub name: Option<String>,  // for TV shows
    pub original_title: Option<String>,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub release_date: Option<String>,
    pub first_air_date: Option<String>,  // for TV shows
    pub vote_average: Option<f64>,
    pub media_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbMovieDetails {
    pub id: i32,
    pub title: String,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub release_date: Option<String>,
    pub runtime: Option<i32>,
    pub vote_average: Option<f64>,
    pub genres: Vec<TmdbGenre>,
    pub credits: Option<TmdbCredits>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbTvDetails {
    pub id: i32,
    pub name: String,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub first_air_date: Option<String>,
    pub vote_average: Option<f64>,
    pub genres: Vec<TmdbGenre>,
    pub seasons: Vec<TmdbSeason>,
    pub credits: Option<TmdbCredits>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbSeason {
    pub id: i32,
    pub season_number: i32,
    pub name: String,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub air_date: Option<String>,
    pub episode_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbSeasonDetails {
    pub id: i32,
    pub season_number: i32,
    pub name: String,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub air_date: Option<String>,
    pub episodes: Vec<TmdbEpisode>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbEpisode {
    pub id: i32,
    pub episode_number: i32,
    pub name: String,
    pub overview: Option<String>,
    pub still_path: Option<String>,
    pub air_date: Option<String>,
    pub runtime: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbCredits {
    pub cast: Vec<TmdbCast>,
    pub crew: Vec<TmdbCrew>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbCast {
    pub id: i32,
    pub name: String,
    pub character: String,
    pub profile_path: Option<String>,
    pub order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbCrew {
    pub id: i32,
    pub name: String,
    pub job: String,
    pub department: String,
    pub profile_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbGenre {
    pub id: i32,
    pub name: String,
}

pub struct TmdbClient {
    client: Client,
    api_key: String,
}

impl TmdbClient {
    pub fn new() -> Result<Self> {
        let api_key = env::var("TMDB_API_KEY")
            .map_err(|_| AppError::Server("TMDB_API_KEY environment variable not set".to_string()))?;
            
        Ok(Self {
            client: Client::new(),
            api_key,
        })
    }
    
    // Search for movies and TV shows
    pub async fn search(&self, query: &str) -> Result<TmdbSearchResult> {
        let url = format!("{}/search/multi?api_key={}&query={}", TMDB_API_URL, self.api_key, query);
        
        self.client.get(&url)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("TMDB API request failed: {}", e)))?
            .json::<TmdbSearchResult>()
            .await
            .map_err(|e| AppError::ExternalApi(format!("Failed to parse TMDB response: {}", e)))
    }
    
    // Get movie details
    pub async fn get_movie(&self, id: i32) -> Result<TmdbMovieDetails> {
        let url = format!(
            "{}/movie/{}?api_key={}&append_to_response=credits", 
            TMDB_API_URL, id, self.api_key
        );
        
        self.client.get(&url)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("TMDB API request failed: {}", e)))?
            .json::<TmdbMovieDetails>()
            .await
            .map_err(|e| AppError::ExternalApi(format!("Failed to parse TMDB response: {}", e)))
    }
    
    // Get TV show details
    pub async fn get_tv(&self, id: i32) -> Result<TmdbTvDetails> {
        let url = format!(
            "{}/tv/{}?api_key={}&append_to_response=credits", 
            TMDB_API_URL, id, self.api_key
        );
        
        self.client.get(&url)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("TMDB API request failed: {}", e)))?
            .json::<TmdbTvDetails>()
            .await
            .map_err(|e| AppError::ExternalApi(format!("Failed to parse TMDB response: {}", e)))
    }
    
    // Get TV season details
    pub async fn get_season(&self, tv_id: i32, season_number: i32) -> Result<TmdbSeasonDetails> {
        let url = format!(
            "{}/tv/{}/season/{}?api_key={}", 
            TMDB_API_URL, tv_id, season_number, self.api_key
        );
        
        self.client.get(&url)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("TMDB API request failed: {}", e)))?
            .json::<TmdbSeasonDetails>()
            .await
            .map_err(|e| AppError::ExternalApi(format!("Failed to parse TMDB response: {}", e)))
    }
    
    // Get TV episode details
    pub async fn get_episode(
        &self, 
        tv_id: i32, 
        season_number: i32, 
        episode_number: i32
    ) -> Result<TmdbEpisode> {
        let url = format!(
            "{}/tv/{}/season/{}/episode/{}?api_key={}", 
            TMDB_API_URL, tv_id, season_number, episode_number, self.api_key
        );
        
        self.client.get(&url)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("TMDB API request failed: {}", e)))?
            .json::<TmdbEpisode>()
            .await
            .map_err(|e| AppError::ExternalApi(format!("Failed to parse TMDB response: {}", e)))
    }
    
    // Get full image URLs
    pub fn get_poster_url(&self, path: &str, size: &str) -> String {
        format!("{}/{}{}", TMDB_IMAGE_BASE_URL, size, path)
    }
    
    pub fn get_backdrop_url(&self, path: &str, size: &str) -> String {
        format!("{}/{}{}", TMDB_IMAGE_BASE_URL, size, path)
    }
    
    pub fn get_profile_url(&self, path: &str, size: &str) -> String {
        format!("{}/{}{}", TMDB_IMAGE_BASE_URL, size, path)
    }
}