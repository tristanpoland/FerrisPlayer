'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MagnifyingGlassIcon, BellIcon } from '@heroicons/react/24/outline';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Determine page title based on current pathname
  const getPageTitle = () => {
    if (pathname === '/') return 'Home';
    if (pathname === '/movies') return 'Movies';
    if (pathname === '/tv') return 'TV Shows';
    if (pathname === '/music') return 'Music';
    if (pathname === '/libraries') return 'Libraries';
    if (pathname === '/history') return 'Watch History';
    if (pathname === '/favorites') return 'Favorites';
    if (pathname === '/settings') return 'Settings';
    if (pathname.startsWith('/search')) return 'Search Results';
    if (pathname.startsWith('/media/')) return 'Media Details';
    return '';
  };

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-gray-800">
      <div className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
        
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface text-white px-4 py-2 pl-10 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </form>
          
          <button className="p-2 rounded-full hover:bg-surface relative">
            <BellIcon className="w-6 h-6 text-gray-300" />
            <span className="absolute top-0 right-0 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              2
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}