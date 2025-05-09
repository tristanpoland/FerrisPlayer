import axios from 'axios';
import { Media, MediaDetails, Season, Episode, Person, Genre, Library, 
  WatchProgress, CreateLibraryDto, UpdateProgressDto, SearchResponse, 
  WatchHistoryItem } from '@/types';

// Default API URL (change this to match your Rust backend)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a default user ID for demo purposes (in a real app, this would come from auth)
const DEFAULT_USER_ID = 'default-user';

// Media endpoints
export const getAllMedia = async (): Promise<Media[]> => {
  const response = await api.get('/media');
  return response.data;
};

export const getMediaById = async (id: string): Promise<Media> => {
  const response = await api.get(`/media/info/${id}`);
  return response.data;
};

export const getMediaByType = async (mediaType: string): Promise<Media[]> => {
  const response = await api.get(`/media/type/${mediaType}`);
  return response.data;
};

export const getMediaDetails = async (id: string): Promise<MediaDetails> => {
  const response = await api.get(`/media/info/${id}`);
  return response.data;
};

export const getMediaStreamUrl = (id: string): string => {
  return `${API_URL}/media/${id}/stream`;
};

// Library endpoints
export const getLibraries = async (): Promise<Library[]> => {
  const response = await api.get('/libraries');
  return response.data;
};

export const createLibrary = async (library: CreateLibraryDto): Promise<Library> => {
  const response = await api.post('/libraries', library);
  return response.data;
};

export const scanLibrary = async (id: string): Promise<{ success: boolean; message: string; results: any }> => {
  const response = await api.post(`/libraries/${id}/scan`);
  return response.data;
};

export const deleteLibrary = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/libraries/${id}`);
  return response.data;
};

// Metadata endpoints
export const searchExternalMedia = async (query: string): Promise<SearchResponse> => {
  const response = await api.get('/metadata/search', { params: { query } });
  return response.data;
};

export const refreshMetadata = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/metadata/refresh/${id}`);
  return response.data;
};

// Watch progress endpoints
export const getWatchProgress = async (mediaId: string, userId = DEFAULT_USER_ID): Promise<WatchProgress | null> => {
  const response = await api.get(`/progress/${mediaId}`, { params: { user_id: userId } });
  return response.data;
};

export const updateWatchProgress = async (progress: Omit<UpdateProgressDto, 'user_id'>, userId = DEFAULT_USER_ID): Promise<WatchProgress> => {
  const response = await api.post(`/progress`, { 
    ...progress,
    user_id: userId
  });
  return response.data;
};

export const deleteWatchProgress = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/progress/${id}`);
  return response.data;
};

export const getWatchHistory = async (userId = DEFAULT_USER_ID): Promise<WatchHistoryItem[]> => {
  const response = await api.get(`/progress/user/${userId}/history`);
  return response.data;
};

// Utility function for error handling
export const handleApiError = (error: any): string => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if (error.response.data && error.response.data.message) {
      return error.response.data.message;
    }
    return `Error ${error.response.status}: ${error.response.statusText}`;
  } else if (error.request) {
    // The request was made but no response was received
    return 'No response received from server. Please check your connection.';
  } else {
    // Something happened in setting up the request that triggered an Error
    return error.message || 'An unknown error occurred';
  }
};