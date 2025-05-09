'use client';

import { useState } from 'react';
import { Cog6ToothIcon, UserIcon, FilmIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'account':
        return <AccountSettings />;
      case 'playback':
        return <PlaybackSettings />;
      case 'about':
        return <AboutSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-surface rounded-lg p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'general' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <Cog6ToothIcon className="w-5 h-5" />
              General
            </button>
            
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'account' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              Account
            </button>
            
            <button
              onClick={() => setActiveTab('playback')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'playback' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <FilmIcon className="w-5 h-5" />
              Playback
            </button>
            
            <button
              onClick={() => setActiveTab('about')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'about' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <ComputerDesktopIcon className="w-5 h-5" />
              About
            </button>
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1 bg-surface rounded-lg p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">General Settings</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Theme</h3>
          <div className="flex items-center gap-4">
            <button className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-16 h-16 flex items-center justify-center focus:ring-2 focus:ring-primary">
              🌙
            </button>
            <button className="bg-gray-300 text-gray-800 border border-gray-700 rounded-lg p-3 w-16 h-16 flex items-center justify-center">
              ☀️
            </button>
            <button className="bg-gradient-to-r from-gray-800 to-gray-300 border border-gray-700 rounded-lg p-3 w-16 h-16 flex items-center justify-center">
              🌓
            </button>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Language</h3>
          <select className="input-field">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
          </select>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Automatic Scanning</h3>
          <label className="flex items-center">
            <input type="checkbox" className="w-4 h-4 bg-gray-800 border-gray-700 rounded mr-2" checked />
            <span>Scan libraries automatically when starting the application</span>
          </label>
        </div>
        
        <button className="button-primary mt-4">Save Changes</button>
      </div>
    </div>
  );
}

function AccountSettings() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Profile</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center text-white text-xl font-semibold">
              U
            </div>
            <button className="button-secondary">Change Avatar</button>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">User Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Username
              </label>
              <input
                type="text"
                className="input-field"
                value="User"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                value="user@example.com"
              />
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Password</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Current Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                New Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>
        
        <button className="button-primary mt-4">Save Changes</button>
      </div>
    </div>
  );
}

function PlaybackSettings() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Playback Settings</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Default Quality</h3>
          <select className="input-field">
            <option value="auto">Auto</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Auto Play</h3>
          <label className="flex items-center">
            <input type="checkbox" className="w-4 h-4 bg-gray-800 border-gray-700 rounded mr-2" checked />
            <span>Auto-play next episode in TV shows</span>
          </label>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Subtitles</h3>
          <label className="flex items-center mb-2">
            <input type="checkbox" className="w-4 h-4 bg-gray-800 border-gray-700 rounded mr-2" />
            <span>Auto-enable subtitles when available</span>
          </label>
          
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">
              Default Language
            </label>
            <select className="input-field">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Resume Playback</h3>
          <label className="flex items-center">
            <input type="checkbox" className="w-4 h-4 bg-gray-800 border-gray-700 rounded mr-2" checked />
            <span>Remember playback position and resume automatically</span>
          </label>
        </div>
        
        <button className="button-primary mt-4">Save Changes</button>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">About MediaRust</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Version</h3>
          <p className="text-gray-400">1.0.0</p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Tech Stack</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="font-medium">Frontend</p>
              <p className="text-gray-400 text-sm">Next.js, React, TailwindCSS</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="font-medium">Backend</p>
              <p className="text-gray-400 text-sm">Rust, Rocket, SQLite</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Libraries</h3>
          <ul className="list-disc list-inside text-gray-400">
            <li>SQLx - SQL toolkit</li>
            <li>TMDB API - Movie metadata</li>
            <li>React Player - Video playback</li>
            <li>Heroicons - UI icons</li>
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">System Information</h3>
          <div className="space-y-1 text-gray-400">
            <p>Operating System: <span className="text-white">Linux</span></p>
            <p>Architecture: <span className="text-white">x86_64</span></p>
            <p>Memory Usage: <span className="text-white">512 MB</span></p>
            <p>Storage: <span className="text-white">24.5 GB / 120 GB</span></p>
          </div>
        </div>
        
        <div className="pt-4 mt-4 border-t border-gray-700">
          <p className="text-gray-400 text-center">
            © 2025 MediaRust. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}