'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getWatchHistory } from '@/lib/api';
import { WatchHistoryItem } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { ClockIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function HistoryPage() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getWatchHistory();
        setHistory(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load watch history:', err);
        setError('Failed to load watch history. Please try again later.');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Watch History</h1>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-xl font-semibold mb-2">No Watch History</p>
          <p className="text-gray-400 mb-4">You haven't watched any media yet.</p>
          <Link href="/" className="button-primary">
            Browse Media
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(item => (
            <div key={item.id} className="bg-surface rounded-lg overflow-hidden flex">
              <div className="relative w-24 h-36 md:w-32 md:h-48 flex-shrink-0">
                {item.posterPath ? (
                  <Image
                    src={item.posterPath}
                    alt={item.mediaTitle}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-600">No Image</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{item.mediaTitle}</h3>
                  
                  {item.episodeTitle && (
                    <p className="text-gray-400 text-sm mt-1">
                      S{item.seasonNumber} E{item.episodeNumber}: {item.episodeTitle}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {formatDate(item.watchedAt)}
                    </span>
                    
                    <span>•</span>
                    
                    <span>
                      {formatDuration(item.duration)}
                    </span>
                    
                    <span>•</span>
                    
                    <span>
                      {item.completed ? 'Completed' : `${Math.round((item.position / item.duration) * 100)}% watched`}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Link
                    href={item.episodeId 
                      ? `/media/${item.mediaId}/play?episode=${item.episodeId}`
                      : `/media/${item.mediaId}/play`}
                    className="button-primary flex items-center gap-2 py-1 px-3 text-sm"
                  >
                    <PlayIcon className="w-4 h-4" />
                    {item.completed ? 'Watch Again' : 'Resume'}
                  </Link>
                  
                  <button
                    className="button-secondary flex items-center gap-2 py-1 px-3 text-sm"
                    onClick={() => {/* Implement delete functionality */}}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}