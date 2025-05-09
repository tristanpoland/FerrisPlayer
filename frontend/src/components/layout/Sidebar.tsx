'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { HomeIcon, FilmIcon, TvIcon, MusicalNoteIcon, FolderIcon, ClockIcon, HeartIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Movies', href: '/movies', icon: FilmIcon },
    { name: 'TV Shows', href: '/tv', icon: TvIcon },
    { name: 'Music', href: '/music', icon: MusicalNoteIcon },
    { name: 'Libraries', href: '/libraries', icon: FolderIcon },
    { name: 'History', href: '/history', icon: ClockIcon },
    { name: 'Favorites', href: '/favorites', icon: HeartIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div 
      className={clsx(
        "bg-surface h-screen transition-all duration-300 flex flex-col sticky top-0",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/" className="flex items-center">
          {isExpanded ? (
            <h1 className="text-xl font-bold text-primary">MediaRust</h1>
          ) : (
            <h1 className="text-xl font-bold text-primary">MR</h1>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-white p-1"
        >
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          )}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={clsx(
              "sidebar-link",
              pathname === item.href && "active",
              !isExpanded && "justify-center px-2"
            )}
          >
            <item.icon className="w-6 h-6" />
            {isExpanded && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center text-white font-semibold">
            U
          </div>
          {isExpanded && (
            <div className="ml-3">
              <p className="text-sm font-medium">User</p>
              <p className="text-xs text-gray-400">Default Account</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}