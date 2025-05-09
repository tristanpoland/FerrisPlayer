'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMediaByType } from '@/lib/api';
import { Media } from '@/types';
import MediaCard from '@/components/media/MediaCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function TVShowsPage() {
  const [tvShows, setTvShows] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getMediaByType('tvshow');
        setTvShows(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load TV shows:', err);
        setError('Failed to load TV shows. Please try again later.');
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
      <h1 className="text-3xl font-bold mb-6">TV Shows</h1>

      {tvShows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No TV shows found in your library.</p>
          <Link href="/libraries" className="button-primary">
            Add a Library
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
        </div>
      )}
    </div>
  );
}