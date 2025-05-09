'use client';

import { useState } from 'react';
import { createLibrary } from '@/lib/api';
import { Library, CreateLibraryDto } from '@/types';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface AddLibraryFormProps {
  onSuccess: (library: Library) => void;
  onCancel: () => void;
}

export default function AddLibraryForm({ onSuccess, onCancel }: AddLibraryFormProps) {
  const [formData, setFormData] = useState<CreateLibraryDto>({
    name: '',
    path: '',
    media_type: 'movie',
    scan_automatically: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      setError('Please enter a library name');
      return;
    }
    
    if (!formData.path.trim()) {
      setError('Please enter a valid path');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const library = await createLibrary(formData);
      onSuccess(library);
    } catch (err: any) {
      console.error('Failed to create library:', err);
      setError(err.response?.data?.message || 'Failed to create library. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage message={error} />}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Library Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input-field"
            placeholder="Movies, TV Shows, etc."
            required
          />
        </div>
        
        <div>
          <label htmlFor="path" className="block text-sm font-medium mb-1">
            Media Path
          </label>
          <input
            type="text"
            id="path"
            name="path"
            value={formData.path}
            onChange={handleChange}
            className="input-field"
            placeholder="/path/to/your/media"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the full path to your media folder
          </p>
        </div>
        
        <div>
          <label htmlFor="media_type" className="block text-sm font-medium mb-1">
            Media Type
          </label>
          <select
            id="media_type"
            name="media_type"
            value={formData.media_type}
            onChange={handleChange}
            className="input-field"
            required
          >
            <option value="movie">Movies</option>
            <option value="tvshow">TV Shows</option>
            <option value="music">Music</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="scan_automatically"
            name="scan_automatically"
            checked={formData.scan_automatically}
            onChange={handleChange}
            className="w-4 h-4 bg-gray-800 border-gray-700 rounded mr-2"
          />
          <label htmlFor="scan_automatically" className="text-sm">
            Scan automatically when adding
          </label>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="button-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="button-primary"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Library'}
        </button>
      </div>
    </form>
  );
}