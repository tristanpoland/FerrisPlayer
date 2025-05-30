'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PlayIcon, ArrowPathIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import axios from 'axios';
import { getWatchProgress, refreshMetadata } from '@/lib/api';
import { MediaDetails, Season, Episode, Person } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface MediaDetailProps {
  params: {
    id: string;
  };
}

export default function MediaDetailPage({ params }: MediaDetailProps) {
  const { id } = params;
  const [media, setMedia] = useState<MediaDetails | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [watchProgress, setWatchProgress] = useState<number | null>(null);
  const [firstEpisodeId, setFirstEpisodeId] = useState<string | null>(null);

  // Function to fetch media details directly from the correct endpoint
  const fetchMediaDetails = async (mediaId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const response = await axios.get(`${API_URL}/media/info/${mediaId}/details`);
    return response.data;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch media details using the correct endpoint
        const details = await fetchMediaDetails(id);
        console.log("Media details:", details);
        setMedia(details);
        
        // If it's a TV show with seasons, set the first season as expanded
        if (details.media_type === 'tvshow' || details.type === 'tvshow') {
          if (details.seasons && details.seasons.length > 0) {
            setExpandedSeason(details.seasons[0].season.id);
            
            // Set first episode for Play button if available
            if (details.seasons[0].episodes && details.seasons[0].episodes.length > 0) {
              setFirstEpisodeId(details.seasons[0].episodes[0].id);
            }
          }
        }
        
        // Get watch progress
        try {
          const progress = await getWatchProgress(id);
          if (progress) {
            setWatchProgress(Math.round((progress.position / progress.duration) * 100));
          }
        } catch (err) {
          console.error('Failed to fetch watch progress:', err);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load media details:', err);
        setError('Failed to load media details. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const handleRefreshMetadata = async () => {
    try {
      setRefreshing(true);
      await refreshMetadata(id);
      
      // Refresh the page data
      const details = await fetchMediaDetails(id);
      setMedia(details);
      setRefreshing(false);
      
      // Reload the page to show updated data
      window.location.reload();
    } catch (err) {
      console.error('Failed to refresh metadata:', err);
      setError('Failed to refresh metadata. Please try again later.');
      setRefreshing(false);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Here you would call an API to update favorites
  };

  const toggleSeason = (seasonId: string) => {
    if (expandedSeason === seasonId) {
      setExpandedSeason(null);
    } else {
      setExpandedSeason(seasonId);
    }
  };

  const renderCast = (people: Person[]) => {
    const cast = people.filter(person => person.role === 'actor');
    return (
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Cast</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {cast.map(person => (
            <div key={person.id} className="bg-surface rounded-lg overflow-hidden">
              {person.profile_path ? (
                <div className="relative aspect-[2/3]">
                  <Image 
                    src={person.profile_path} 
                    alt={person.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="relative aspect-[2/3] bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
              <div className="p-2">
                <p className="font-medium text-sm">{person.name}</p>
                {person.character && (
                  <p className="text-gray-400 text-xs">{person.character}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSeasons = () => {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Seasons</h3>
        {!media?.seasons || media.seasons.length === 0 ? (
          <div className="bg-surface rounded-lg p-6 text-center">
            <p className="text-gray-400">No seasons found for this TV show.</p>
            <button 
              onClick={handleRefreshMetadata}
              className="button-secondary mt-4"
            >
              Refresh Metadata
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {media.seasons.map(({ season, episodes }) => (
              <div key={season.id} className="bg-surface rounded-lg overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
                  onClick={() => toggleSeason(season.id)}
                >
                  <div className="flex items-center gap-4">
                    {season.poster_path && (
                      <div className="relative w-16 h-24">
                        <Image 
                          src={season.poster_path} 
                          alt={season.title || `Season ${season.season_number}`}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold">{season.title || `Season ${season.season_number}`}</h4>
                      <p className="text-sm text-gray-400">{episodes.length} Episodes</p>
                    </div>
                  </div>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1.5} 
                    stroke="currentColor" 
                    className={`w-5 h-5 transform transition-transform ${expandedSeason === season.id ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                
                {expandedSeason === season.id && (
                  <div className="px-4 pb-4 divide-y divide-gray-800">
                    {episodes.length === 0 ? (
                      <div className="py-4 text-center text-gray-400">
                        No episodes found for this season. Try refreshing metadata.
                      </div>
                    ) : (
                      episodes.map(episode => (
                        <div key={episode.id} className="py-3 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">{episode.episode_number}.</span>
                              <h5 className="font-medium">{episode.title}</h5>
                            </div>
                            {episode.overview && (
                              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{episode.overview}</p>
                            )}
                          </div>
                          <Link 
                            href={`/media/${id}/play?episode=${episode.id}`}
                            className="p-2 rounded-full bg-primary/10 hover:bg-primary/20"
                          >
                            <PlayIcon className="w-5 h-5" />
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner title={''} children={undefined} />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!media) {
    return <ErrorMessage message="Media not found" />;
  }

  // Handle different media_type property names
  const mediaType = media.media_type || media.type;

  return (
    <div className="-mx-6 -mt-6">
      {/* Backdrop */}
      <div className="relative h-[50vh] md:h-[60vh]">
        {media.backdrop_path ? (
          <Image
            src={media.backdrop_path}
            alt={media.title}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        
        {/* Content overlay */}
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-6 pb-8 md:pb-12 w-full">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Poster */}
              {media.poster_path && (
                <div className="hidden md:block relative w-64 h-96 rounded-lg overflow-hidden shadow-lg">
                  <Image
                    src={media.poster_path}
                    alt={media.title}
                    fill
                    className="object-cover"
                  />
                  
                  {watchProgress !== null && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <div 
                        className="h-full bg-primary"
                        style={{ width: `${watchProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Details */}
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{media.title}</h1>
                
                <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                  {media.year && <span>{media.year}</span>}
                  {media.rating && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {media.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="capitalize">{mediaType}</span>
                  
                  {media.genres && media.genres.length > 0 && (
                    <span className="text-gray-400">
                      {media.genres.map(g => g.name).join(', ')}
                    </span>
                  )}
                </div>
                
                {media.overview && (
                  <p className="text-gray-300 mb-6 max-w-3xl">
                    {media.overview}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-3">
                  {/* Only show direct Play button for movies, not for TV shows */}
                  {mediaType === 'movie' && (
                    <Link 
                      href={`/media/${media.id}/play`} 
                      className="button-primary flex items-center gap-2"
                    >
                      <PlayIcon className="w-5 h-5" />
                      Play
                    </Link>
                  )}
                  
                  {/* For TV shows, if there's a first episode, offer to play it */}
                  {mediaType === 'tvshow' && firstEpisodeId && (
                    <Link 
                      href={`/media/${media.id}/play?episode=${firstEpisodeId}`} 
                      className="button-primary flex items-center gap-2"
                    >
                      <PlayIcon className="w-5 h-5" />
                      Play First Episode
                    </Link>
                  )}
                  
                  <button
                    onClick={toggleFavorite}
                    className="button-secondary flex items-center gap-2"
                  >
                    {isFavorite ? (
                      <>
                        <HeartIconSolid className="w-5 h-5 text-primary" />
                        Favorited
                      </>
                    ) : (
                      <>
                        <HeartIcon className="w-5 h-5" />
                        Add to Favorites
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleRefreshMetadata}
                    disabled={refreshing}
                    className="button-secondary flex items-center gap-2"
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Metadata'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Seasons (for TV shows) */}
        {(mediaType === 'tvshow') && renderSeasons()}
        
        {/* Cast */}
        {media.people && media.people.length > 0 && (
          renderCast(media.people)
        )}
        
        {/* Debug info - uncomment if needed for troubleshooting */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Debug Info</h3>
            <pre className="text-xs overflow-auto whitespace-pre-wrap">
              TV Show: {mediaType === 'tvshow' ? 'Yes' : 'No'}<br />
              Seasons: {media.seasons ? media.seasons.length : 0}<br />
              First Episode ID: {firstEpisodeId || 'None'}<br />
              Expanded Season: {expandedSeason || 'None'}<br />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}