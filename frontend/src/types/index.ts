export interface Media {
    id: string;
    title: string;
    media_type: string;
    year?: number;
    path: string;
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    rating?: number;
    added_at: string;
    last_watched?: string;
    watch_count: number;
  }
  
  export interface Season {
    id: string;
    media_id: string;
    season_number: number;
    title?: string;
    overview?: string;
    poster_path?: string;
  }
  
  export interface Episode {
    id: string;
    media_id: string;
    season_id: string;
    episode_number: number;
    title: string;
    overview?: string;
    path: string;
    still_path?: string;
    air_date?: string;
    runtime?: number;
  }
  
  export interface Person {
    id: string;
    name: string;
    profile_path?: string;
    biography?: string;
    role?: string;
    character?: string;
  }
  
  export interface Genre {
    id: string;
    name: string;
  }
  
  export interface Library {
    id: string;
    name: string;
    path: string;
    media_type: string;
    scan_automatically: boolean;
  }
  
  export interface WatchProgress {
    id: string;
    user_id: string;
    media_id: string;
    episode_id?: string;
    position: number;
    duration: number;
    watched_at: string;
    completed: boolean;
  }
  
  export interface CreateLibraryDto {
    name: string;
    path: string;
    media_type: string;
    scan_automatically?: boolean;
  }
  
  export interface UpdateProgressDto {
    user_id: string;
    media_id: string;
    episode_id?: string;
    position: number;
    duration: number;
    completed?: boolean;
  }
  
  export interface MediaDetails extends Media {
    seasons?: {
      season: Season;
      episodes: Episode[];
    }[];
    people?: Person[];
    genres?: Genre[];
  }
  
  export interface WatchHistoryItem {
    id: string;
    mediaId: string;
    mediaTitle: string;
    mediaType: string;
    posterPath?: string;
    episodeId?: string;
    episodeTitle?: string;
    episodeNumber?: number;
    seasonNumber?: number;
    position: number;
    duration: number;
    watchedAt: string;
    completed: boolean;
  }
  
  export interface SearchResult {
    id: number;
    title: string;
    overview?: string;
    posterUrl?: string;
    backdropUrl?: string;
    year?: string;
    rating?: number;
    mediaType: string;
  }
  
  export interface SearchResponse {
    results: SearchResult[];
    totalResults: number;
    totalPages: number;
    page: number;
  }