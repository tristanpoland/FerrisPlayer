'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMediaByType } from '@/lib/api';
import { Media } from '@/types';
import MediaCard from '@/components/media/MediaCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function MoviesPage() {
  const [movies, setMovies] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getMediaByType('movie');
        setMovies(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load movies:', err);
        setError('Failed to load movies. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner title={''} children={undefined} />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Movies</h1>

      {movies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No movies found in your library.</p>
          <Link href="/libraries" className="button-primary">
            Add a Library
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
        </div>
      )}
    </div>
  );
}