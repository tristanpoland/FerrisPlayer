import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface MediaRowProps {
  title: string;
  type?: 'movie' | 'tvshow' | 'music' | 'recent' | 'history';
  seeAllLink?: string;
  children: React.ReactNode;
}

export default function MediaRow({ title, type, seeAllLink, children }: MediaRowProps) {
  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        
        {seeAllLink && (
          <Link 
            href={seeAllLink} 
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            See All
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        )}
      </div>
      
      <div className="flex overflow-x-auto pb-4 -mx-2 scrollbar-hide">
        <div className="flex gap-4 px-2">
          {children}
        </div>
      </div>
    </section>
  );
}