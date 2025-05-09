'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getAllMedia, searchExternalMedia } from '@/lib/api';
import { Media, SearchResult } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [localResults, setLocalResults] = useState<Media[]>([]);
  const [externalResults, setExternalResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Search local library
        const allMedia = await getAllMedia();
        const filteredMedia = allMedia.filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase())
        );
        setLocalResults(filteredMedia);
        
        // Search external sources (TMDB)
        const externalData = await searchExternalMedia(query);
        setExternalResults(externalData.results);
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load search results:', err);
        setError('Failed to load search results. Please try again later.');
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (loading) {
    return <LoadingSpinner title={''} children={undefined} />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!query) {
    return (
      <div className="text-center py-16">
        <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Search for Movies, TV Shows, and Music</h2>
        <p className="text-gray-400 mb-4">Enter a search term in the search bar above</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Search Results for "{query}"</h1>
      
      {localResults.length === 0 && externalResults.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No results found for "{query}".</p>
          <p className="text-gray-400">Try a different search term or add new content to your library.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Local results */}
          {localResults.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">From Your Library</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {localResults.map(item => (
                  <Link key={item.id} href={`/media/${item.id}`}>
                    <div className="bg-surface rounded-lg overflow-hidden hover:bg-surface-light transition">
                      <div className="relative aspect-[2/3]">
                        {item.poster_path ? (
                          <Image
                            src={item.poster_path}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-600">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium truncate">{item.title}</h3>
                        <p className="text-gray-400 text-sm flex justify-between">
                          <span>{item.year}</span>
                          <span className="capitalize">{item.media_type}</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* External results */}
          {externalResults.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Available to Add</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {externalResults.map(item => (
                  <div key={item.id} className="bg-surface rounded-lg overflow-hidden flex">
                    <div className="relative w-24 h-36 md:w-32 md:h-48 flex-shrink-0">
                      {item.posterUrl ? (
                        <Image
                          src={item.posterUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-600">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col">
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                          {item.year && <span>{item.year}</span>}
                          {item.rating && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {item.rating.toFixed(1)}
                            </span>
                          )}
                          <span className="capitalize">{item.mediaType}</span>
                        </div>
                        
                        {item.overview && (
                          <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                            {item.overview}
                          </p>
                        )}
                      </div>
                      
                      <button className="button-primary mt-auto self-start">
                        Add to Library
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}