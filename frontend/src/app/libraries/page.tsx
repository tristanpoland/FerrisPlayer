'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, FolderIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { getLibraries, deleteLibrary, scanLibrary } from '@/lib/api';
import { Library } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import AddLibraryForm from '@/components/libraries/AddLibraryForm';

export default function LibrariesPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scanResults, setScanResults] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    try {
      setLoading(true);
      const data = await getLibraries();
      setLibraries(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load libraries:', err);
      setError('Failed to load libraries. Please try again later.');
      setLoading(false);
    }
  };

  const handleScanLibrary = async (libraryId: string) => {
    try {
      setScanning(libraryId);
      setScanResults(null);
      const result = await scanLibrary(libraryId);
      setScanResults(result.results);
      setScanning(null);
      
      // Refresh the library list to get updated counts
      fetchLibraries();
    } catch (err) {
      console.error('Failed to scan library:', err);
      setError('Failed to scan library. Please try again later.');
      setScanning(null);
    }
  };

  const handleDeleteLibrary = async (libraryId: string) => {
    if (!confirm('Are you sure you want to delete this library? This will not delete your media files, only the database entries.')) {
      return;
    }
    
    try {
      await deleteLibrary(libraryId);
      
      // Remove the deleted library from the list
      setLibraries(libraries.filter(lib => lib.id !== libraryId));
    } catch (err) {
      console.error('Failed to delete library:', err);
      setError('Failed to delete library. Please try again later.');
    }
  };

  const handleAddLibrary = () => {
    setShowAddForm(true);
  };

  const handleLibraryAdded = (newLibrary: Library) => {
    setLibraries([...libraries, newLibrary]);
    setShowAddForm(false);
  };

  const getLibraryTypeIcon = (type: string) => {
    switch (type) {
      case 'movie':
        return '🎬';
      case 'tvshow':
        return '📺';
      case 'music':
        return '🎵';
      default:
        return '📁';
    }
  };

  if (loading) {
    return <LoadingSpinner title={''} children={undefined} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Media Libraries</h1>
        <button 
          onClick={handleAddLibrary}
          className="button-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Library
        </button>
      </div>
      
      {error && <ErrorMessage message={error} />}
      
      {/* Library List */}
      {libraries.length === 0 ? (
        <div className="bg-surface rounded-lg p-8 text-center">
          <FolderIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Libraries Found</h2>
          <p className="text-gray-400 mb-6">
            Add your first media library to start organizing your content.
          </p>
          <button 
            onClick={handleAddLibrary}
            className="button-primary"
          >
            Add Your First Library
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {libraries.map(library => (
            <div key={library.id} className="bg-surface rounded-lg overflow-hidden border border-gray-800">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getLibraryTypeIcon(library.media_type)}</span>
                      <h2 className="text-xl font-semibold">{library.name}</h2>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 break-all">{library.path}</p>
                    <p className="text-sm">
                      <span className="capitalize">{library.media_type}</span> Library
                      {library.scan_automatically && (
                        <span className="text-green-500 ml-2">• Auto-scan</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-800 p-4 flex justify-between items-center bg-black/20">
                <button
                  onClick={() => handleDeleteLibrary(library.id)}
                  className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-white/5"
                  title="Delete Library"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => handleScanLibrary(library.id)}
                  disabled={scanning === library.id}
                  className="flex items-center gap-2 button-secondary"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${scanning === library.id ? 'animate-spin' : ''}`} />
                  {scanning === library.id ? 'Scanning...' : 'Scan Library'}
                </button>
              </div>
              
              {/* Scan Results */}
              {scanResults && scanning === null && (
                <div className="border-t border-gray-800 p-4 bg-green-900/20">
                  <h3 className="font-semibold mb-2">Scan Results:</h3>
                  <ul className="text-sm space-y-1">
                    {scanResults.addedShows && (
                      <li>Added {scanResults.addedShows} TV shows</li>
                    )}
                    {scanResults.addedSeasons && (
                      <li>Added {scanResults.addedSeasons} seasons</li>
                    )}
                    {scanResults.addedEpisodes && (
                      <li>Added {scanResults.addedEpisodes} episodes</li>
                    )}
                    {scanResults.existingEpisodes && (
                      <li>Found {scanResults.existingEpisodes} existing episodes</li>
                    )}
                    {scanResults.added && (
                      <li>Added {scanResults.added} movies</li>
                    )}
                    {scanResults.existing && (
                      <li>Found {scanResults.existing} existing movies</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Add Library Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Add Media Library</h2>
              <AddLibraryForm 
                onSuccess={handleLibraryAdded}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}