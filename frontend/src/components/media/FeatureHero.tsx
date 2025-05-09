import Image from 'next/image';
import Link from 'next/link';
import { PlayIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { Media } from '@/types';

interface FeatureHeroProps {
  media: Media;
}

export default function FeatureHero({ media }: FeatureHeroProps) {
  const placeholderImage = 'https://via.placeholder.com/1920x1080?text=No+Backdrop+Image';
  const backdropUrl = media.backdrop_path || placeholderImage;
  
  return (
    <div className="-mx-6 -mt-6 relative h-[70vh] max-h-[600px] mb-10">
      {/* Backdrop image */}
      <div className="absolute inset-0">
        <Image
          src={backdropUrl}
          alt={media.title}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex items-end">
        <div className="container mx-auto px-6 pb-16 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{media.title}</h1>
          
          <div className="flex items-center gap-4 mb-4">
            {media.year && <span className="text-sm bg-white/20 px-2 py-1 rounded">{media.year}</span>}
            {media.rating && (
              <span className="text-sm flex items-center gap-1">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {media.rating.toFixed(1)}
              </span>
            )}
            <span className="text-sm capitalize">{media.media_type}</span>
          </div>
          
          {media.overview && (
            <p className="text-gray-200 mb-6 line-clamp-3 max-w-2xl">
              {media.overview}
            </p>
          )}
          
          <div className="flex gap-4">
            <Link href={`/media/${media.id}/play`} className="button-primary flex items-center gap-2">
              <PlayIcon className="w-5 h-5" />
              Play
            </Link>
            <Link href={`/media/${media.id}`} className="button-secondary flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}