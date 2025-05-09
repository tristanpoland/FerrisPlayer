'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HeartIcon } from '@heroicons/react/24/outline';
import { getAllMedia } from '@/lib/api';
import { Media } from '@/types';
import MediaCard from '@/components/media/MediaCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // For now, just show some random media since we don't have a favorites system implemented
        // In a real app, you would have an API endpoint for favorites
        const allMedia = await getAllMedia();
        
        // Simulate favorites by taking a few random items
        // This is just a placeholder - in a real app, this would be properly implemented
        const randomFavorites = allMedia
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(8, allMedia.length));
        
        setFavorites(randomFavorites);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load favorites:', err);
        setError('Failed to load favorites. Please try again later.');
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
      <h1 className="text-3xl font-bold mb-6">Favorites</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <HeartIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-xl font-semibold mb-2">No Favorites Yet</p>
          <p className="text-gray-400 mb-4">You haven't added any favorites yet.</p>
          <Link href="/" className="button-primary">
            Browse Media
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {favorites.map(item => (
            <Link key={item.id} href={`/media/${item.id}`}>
              <MediaCard
                id={item.id}
                title={item.title}
                posterPath={item.poster_path}
                year={item.year}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}