import Image from 'next/image';
import { PlayIcon } from '@heroicons/react/24/solid';

interface MediaCardProps {
  id: string;
  title: string;
  posterPath?: string;
  year?: number;
  progress?: number;
  episodeInfo?: string;
}

export default function MediaCard({ id, title, posterPath, year, progress, episodeInfo }: MediaCardProps) {
  const placeholderImage = 'https://via.placeholder.com/300x450?text=No+Image';
  
  return (
    <div className="media-card group relative w-40 md:w-44 lg:w-48 rounded-lg overflow-hidden bg-surface shadow-md">
      <div className="relative aspect-[2/3] bg-gray-800">
        {posterPath ? (
          <Image
            src={posterPath}
            alt={title}
            fill
            sizes="(max-width: 768px) 160px, 192px"
            className="object-cover"
          />
        ) : (
          <Image
            src={placeholderImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 160px, 192px"
            className="object-cover"
          />
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
            <PlayIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        {/* Progress bar */}
        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <div 
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{title}</h3>
        <div className="flex items-center justify-between mt-1">
          {year && (
            <span className="text-gray-400 text-xs">{year}</span>
          )}
          {episodeInfo && (
            <span className="text-gray-400 text-xs">{episodeInfo}</span>
          )}
        </div>
      </div>
    </div>
  );
}