'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MediaCard from '@/components/media/MediaCard';
import FeatureHero from '@/components/media/FeatureHero';
import MediaRow from '@/components/media/MediaRow';
import { getAllMedia, getMediaByType, getWatchHistory } from '@/lib/api';
import { Media, WatchHistoryItem } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function Home() {
  const [media, setMedia] = useState<Media[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Media[]>([]);
  const [movies, setMovies] = useState<Media[]>([]);
  const [tvShows, setTvShows] = useState<Media[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);
  const [featuredMedia, setFeaturedMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all media
        const allMedia = await getAllMedia();
        
        // Set media
        setMedia(allMedia);
        
        // Sort by added date to get recently added
        const sorted = [...allMedia].sort((a, b) => 
          new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
        );
        setRecentlyAdded(sorted.slice(0, 10));
        
        // Set featured media (prioritize items with backdrops and higher ratings)
        const withBackdrop = allMedia.filter(item => item.backdrop_path);
        if (withBackdrop.length > 0) {
          // Prioritize newer items with higher ratings
          const featured = [...withBackdrop]
            .sort((a, b) => {
              // Sort by rating (if available) and recency
              const ratingA = a.rating ?? 0;
              const ratingB = b.rating ?? 0;
              const dateA = new Date(a.added_at).getTime();
              const dateB = new Date(b.added_at).getTime();
              
              // Weight: 70% rating, 30% recency
              return (ratingB * 0.7 + dateB * 0.3) - (ratingA * 0.7 + dateA * 0.3);
            });
          
          setFeaturedMedia(featured[0]);
        } else if (allMedia.length > 0) {
          setFeaturedMedia(allMedia[0]);
        }
        
        // Fetch movies and TV shows
        const movieList = await getMediaByType('movie');
        setMovies(movieList);
        
        const tvList = await getMediaByType('tvshow');
        setTvShows(tvList);
        
        // Fetch continue watching
        const history = await getWatchHistory();
        
        // Filter to show only items not completed and sort by most recently watched
        const continueItems = history
          .filter(item => !item.completed)
          .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
          .slice(0, 10);
          
        setContinueWatching(continueItems);
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner title={''} />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-10">
      {featuredMedia && (
        <FeatureHero media={featuredMedia} />
      )}
      
      {continueWatching.length > 0 && (
        <MediaRow title="Continue Watching" type="history">
          {continueWatching.map(item => (
            <Link key={item.id} href={`/media/${item.mediaId}`}>
              <MediaCard
                id={item.mediaId}
                title={item.mediaTitle}
                posterPath={item.posterPath}
                progress={Math.round((item.position / item.duration) * 100)}
                episodeInfo={item.episodeTitle ? `S${item.seasonNumber} E${item.episodeNumber}` : undefined}
              />
            </Link>
          ))}
        </MediaRow>
      )}
      
      {recentlyAdded.length > 0 && (
        <MediaRow title="Recently Added" type="recent">
          {recentlyAdded.map(item => (
            <Link key={item.id} href={`/media/${item.id}`}>
              <MediaCard 
                id={item.id}
                title={item.title}
                posterPath={item.poster_path}
                year={item.year}
              />
            </Link>
          ))}
        </MediaRow>
      )}
      
      {movies.length > 0 && (
        <MediaRow title="Movies" type="movie" seeAllLink="/movies">
          {movies.map(movie => (
            <Link key={movie.id} href={`/media/${movie.id}`}>
              <MediaCard 
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                year={movie.year}
              />
            </Link>
          ))}
        </MediaRow>
      )}
      
      {tvShows.length > 0 && (
        <MediaRow title="TV Shows" type="tvshow" seeAllLink="/tv">
          {tvShows.map(show => (
            <Link key={show.id} href={`/media/${show.id}`}>
              <MediaCard 
                id={show.id}
                title={show.title}
                posterPath={show.poster_path}
                year={show.year}
              />
            </Link>
          ))}
        </MediaRow>
      )}
      
      {media.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to MediaRust!</h2>
          <p className="text-gray-400 mb-8 max-w-lg">
            Your media library is empty. Start by adding a library to scan your media files.
          </p>
          <Link href="/libraries" className="button-primary">
            Add a Library
          </Link>
        </div>
      )}
    </div>
  );
}