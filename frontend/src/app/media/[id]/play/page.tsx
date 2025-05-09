"use client"
import { useMemo } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactPlayer from 'react-player';
import axios from 'axios';
import { getMediaById, updateWatchProgress } from '@/lib/api';
import { Media, Episode } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { ArrowLeftIcon, 
       PlayIcon, 
       PauseIcon, 
       SpeakerWaveIcon, 
       SpeakerXMarkIcon, 
       ArrowsPointingOutIcon } from '@heroicons/react/24/solid';

interface VideoPlayerProps {
params: {
  id: string;
};
}

export default function VideoPlayerPage({ params }: VideoPlayerProps) {
const { id } = params;
const router = useRouter();

const searchParams = useSearchParams();

const episodeId = useMemo(() => {
  return searchParams.get('episode');
}, [searchParams]);


const [media, setMedia] = useState<Media | null>(null);
const [episode, setEpisode] = useState<Episode | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isPlaying, setIsPlaying] = useState(true);
const [volume, setVolume] = useState(0.8);
const [muted, setMuted] = useState(false);
const [played, setPlayed] = useState(0);
const [duration, setDuration] = useState(0);
const [showControls, setShowControls] = useState(true);
const [seeking, setSeeking] = useState(false);
// Add a seekLock timestamp to prevent progress updates after seeking
const [seekLock, setSeekLock] = useState<number | null>(null);

const playerRef = useRef<ReactPlayer>(null);
const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Function to fetch episode data directly
const fetchEpisode = async (id: string) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const response = await axios.get(`${API_URL}/episodes/${id}`);
  return response.data;
};

// Function to get the stream URL for a media or episode
const getStreamUrl = () => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  if (episodeId) {
    return `${API_URL}/episodes/stream/${episodeId}`;
  } else {
    return `${API_URL}/media/${id}/stream`;
  }
};

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get media details
      const mediaData = await getMediaById(id);
      setMedia(mediaData);
      
      // If there's an episode ID, fetch episode details
      if (episodeId) {
        try {
          const episodeData = await fetchEpisode(episodeId);
          setEpisode(episodeData);
        } catch (err) {
          console.error('Failed to fetch episode:', err);
          // For TV shows, if we can't get the episode, redirect back to the show page
          if (mediaData.media_type === 'tvshow' || mediaData.type === 'tvshow') {
            setError('Episode not found. Redirecting to show page...');
            setTimeout(() => router.push(`/media/${id}`), 2000);
            return;
          }
        }
      } else if (mediaData.media_type === 'tvshow' || mediaData.type === 'tvshow') {
        // If it's a TV show but no episode ID was provided, redirect to the show page
        setError('Please select an episode. Redirecting to show page...');
        setTimeout(() => router.push(`/media/${id}`), 2000);
        return;
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load media:', err);
      setError('Failed to load media. Please try again later.');
      setLoading(false);
    }
  };
  
  fetchData();
  
  // Hide cursor and controls after a delay
  const hideControls = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };
  
  // Set up event listeners
  document.addEventListener('mousemove', () => {
    setShowControls(true);
    hideControls();
  });
  
  hideControls();
  
  // Clean up
  return () => {
    document.removeEventListener('mousemove', () => {});
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };
}, [id, episodeId, router]);

// Add keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Show controls when any key is pressed
    setShowControls(true);
    
    // Don't trigger shortcuts if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    switch (e.key) {
      case ' ':  // Space bar
        e.preventDefault(); // Prevent page scrolling
        setIsPlaying(!isPlaying);
        break;
      case 'k':  // YouTube-style play/pause
        setIsPlaying(!isPlaying);
        break;
      case 'ArrowLeft':  // Left arrow - go back 5 seconds
        if (playerRef.current) {
          // First update played for immediate UI feedback
          const newTime = Math.max(0, played * duration - 5);
          const newPercentage = newTime / duration;
          setPlayed(newPercentage);
          
          // Temporarily pause for better seeking reliability
          const wasPlaying = isPlaying;
          if (wasPlaying) setIsPlaying(false);
          
          // Then seek
          playerRef.current.seekTo(newPercentage, 'fraction');
          
          // Resume playback after a short delay
          setTimeout(() => {
            if (wasPlaying) setIsPlaying(true);
          }, 100);
        }
        break;
      case 'ArrowRight':  // Right arrow - go forward 5 seconds
        if (playerRef.current) {
          // First update played for immediate UI feedback
          const newTime = Math.min(duration, played * duration + 5);
          const newPercentage = newTime / duration;
          setPlayed(newPercentage);
          
          // Temporarily pause for better seeking reliability
          const wasPlaying = isPlaying;
          if (wasPlaying) setIsPlaying(false);
          
          // Then seek
          playerRef.current.seekTo(newPercentage, 'fraction');
          
          // Resume playback after a short delay
          setTimeout(() => {
            if (wasPlaying) setIsPlaying(true);
          }, 100);
        }
        break;
      case 'ArrowUp':  // Up arrow - volume up
        e.preventDefault(); // Prevent page scrolling
        handleVolumeChange(Math.min(1, volume + 0.05));
        break;
      case 'ArrowDown':  // Down arrow - volume down
        e.preventDefault(); // Prevent page scrolling
        handleVolumeChange(Math.max(0, volume - 0.05));
        break;
      case 'm':  // Mute toggle
      case 'M':
        toggleMute();
        break;
      case 'f':  // Fullscreen toggle
      case 'F':
        handleFullscreen();
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        // Jump to percentage of video (0-90%)
        if (playerRef.current) {
          const percent = parseInt(e.key, 10) / 10;
          
          // Update UI first
          setPlayed(percent);
          
          // Temporarily pause
          const wasPlaying = isPlaying;
          if (wasPlaying) setIsPlaying(false);
          
          // Then perform seek
          playerRef.current.seekTo(percent, 'fraction');
          
          // Resume playback
          setTimeout(() => {
            if (wasPlaying) setIsPlaying(true);
          }, 100);
        }
        break;
    }
  };
  
  // Add event listener
  document.addEventListener('keydown', handleKeyDown);
  
  // Cleanup
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [isPlaying, volume, played, duration]);

// Disable auto-save progress during seeking
useEffect(() => {
  const saveProgressInterval = setInterval(() => {
    // Don't save progress during seeking or immediately after (when seekLock is active)
    if (playerRef.current && !seeking && played > 0 && duration > 0 && 
        (!seekLock || Date.now() - seekLock > 1000)) {
      const currentTime = Math.floor(played * duration);
      saveProgress(currentTime);
    }
  }, 10000); // Save every 10 seconds
  
  return () => {
    clearInterval(saveProgressInterval);
  };
}, [played, duration, seeking, seekLock]);

const saveProgress = async (position: number) => {
  if (!media) return;
  
  try {
    await updateWatchProgress({
      media_id: media.id,
      episode_id: episode?.id,
      position,
      duration: Math.floor(duration),
      completed: played > 0.9 // Mark as completed if played more than 90%
    });
  } catch (err) {
    console.error('Failed to save watch progress:', err);
  }
};

const handlePlay = () => {
  setIsPlaying(true);
};

const handlePause = () => {
  setIsPlaying(false);
};

const handleVolumeChange = (newVolume: number) => {
  setVolume(newVolume);
  setMuted(newVolume === 0);
};

const toggleMute = () => {
  setMuted(!muted);
};

const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
  // Skip progress updates if we're seeking or if seek lock is active
  if (seeking) return;
  
  // If seekLock is active and it's been less than 1 second, ignore progress updates
  if (seekLock && Date.now() - seekLock < 1000) return;
  
  // Otherwise, update normally
  setPlayed(state.played);
};

const handleDuration = (duration: number) => {
  setDuration(duration);
};

// Complete rewrite of seeking functionality to fix persistent issues
const handleSeekMouseDown = () => {
  setSeeking(true);
  setIsPlaying(false); // Pause while seeking
};

const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newValue = parseFloat(e.target.value);
  setPlayed(newValue); // Update UI immediately
};

const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
  const seekTime = parseFloat((e.target as HTMLInputElement).value);
  
  // Set a seekLock timestamp to prevent progress updates after seeking
  setSeekLock(Date.now());
  
  // Ensure seek actually happens by directly accessing the player
  if (playerRef.current) {
    // Force seek with both methods for maximum compatibility
    playerRef.current.seekTo(seekTime, 'fraction');
    
    // Force update the player's internal state by setting a specific time
    const seconds = seekTime * duration;
    playerRef.current.seekTo(seconds, 'seconds');
  }
  
  // Resume playback after ensuring seek is complete
  setTimeout(() => {
    setSeeking(false);
    setIsPlaying(true);
    
    // Force one more seek to ensure it stays at the right position
    if (playerRef.current) {
      playerRef.current.seekTo(seekTime, 'fraction');
    }
  }, 200);
};

const handleFullscreen = () => {
  const videoContainer = document.getElementById('video-container');
  if (!videoContainer) return;
  
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    videoContainer.requestFullscreen();
  }
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  }
  return `${m}:${s < 10 ? '0' + s : s}`;
};

// Get formatted episode title
const getFormattedEpisodeTitle = () => {
  if (!episode) return null;
  
  // Try to extract season number from episode metadata if available
  // For now, we'll just show episode number
  return `Episode ${episode.episode_number}: ${episode.title}`;
};

if (loading) {
  return <LoadingSpinner title={''} children={undefined} />;
}

if (error) {
  return <ErrorMessage message={error} />;
}

if (!media) {
  return <ErrorMessage message="Media not found" />;
}

// Handle different media_type property names
const mediaType = media.media_type || media.type;

// Improved handler for direct click on progress bar
const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
  const progressBar = e.currentTarget;
  const rect = progressBar.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const percentage = offsetX / rect.width;
  
  // Only process valid percentages
  if (percentage >= 0 && percentage <= 1) {
    // Pause playback and mark as seeking
    setSeeking(true);
    const wasPlaying = isPlaying;
    setIsPlaying(false);
    
    // Set seekLock to prevent progress updates
    setSeekLock(Date.now());
    
    // Update UI state
    setPlayed(percentage);
    
    // Force seek with multiple methods for reliability
    if (playerRef.current) {
      playerRef.current.seekTo(percentage, 'fraction');
      const seconds = percentage * duration;
      playerRef.current.seekTo(seconds, 'seconds');
      
      // Resume playback after a delay
      setTimeout(() => {
        if (wasPlaying) {
          setIsPlaying(true);
        }
        setSeeking(false);
        
        // Force one more seek for reliability
        playerRef.current.seekTo(percentage, 'fraction');
      }, 200);
    }
  }
};

return (
  <div className="-mx-6 -mt-6 h-screen bg-black relative" id="video-container">
    {/* Video Player */}
    <ReactPlayer
      ref={playerRef}
      url={getStreamUrl()}
      className="absolute top-0 left-0 right-0 bottom-0"
      width="100%"
      height="100%"
      playing={isPlaying}
      volume={volume}
      muted={muted}
      onPlay={handlePlay}
      onPause={handlePause}
      onProgress={handleProgress}
      onDuration={handleDuration}
      progressInterval={1000}
      config={{
        file: {
          attributes: {
            controlsList: 'nodownload'
          }
        }
      }}
    />
    
    {/* Back button (minimalist) */}
    <div className={`absolute top-4 left-4 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <button 
        onClick={() => window.history.back()}
        className="text-white bg-black/30 backdrop-blur-md p-2 rounded-full hover:bg-black/50"
      >
        <ArrowLeftIcon className="w-5 h-5" />
      </button>
    </div>

    {/* Keyboard shortcuts indicator - shows briefly when controls appear */}
    <div
      className={`absolute top-12 right-8 bg-black/60 backdrop-blur-md px-4 py-3 rounded-lg text-white text-xs transition-opacity duration-300
                 ${showControls ? 'opacity-80' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div>Space / K: Play/Pause</div>
        <div>M: Mute</div>
        <div>←/→: Skip 5s</div>
        <div>↑/↓: Volume</div>
        <div>F: Fullscreen</div>
        <div>0-9: Jump to position</div>
      </div>
    </div>
    
    {/* Floating Controls */}
    <div 
      className={`absolute left-1/2 bottom-8 transform -translate-x-1/2 transition-opacity duration-300 
                 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Main controls container with blur */}
      <div className="bg-black/40 backdrop-blur-md rounded-full p-3 shadow-lg max-w-3xl">
        <div className="flex items-center gap-4">
          {/* Play/Pause button */}
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-full hover:bg-white/10 text-white"
          >
            {isPlaying ? (
              <PauseIcon className="w-6 h-6" />
            ) : (
              <PlayIcon className="w-6 h-6" />
            )}
          </button>
          
          {/* Current time */}
          <span className="text-white text-sm font-medium">
            {formatTime(played * duration)}
          </span>
          
          {/* Progress bar */}
          <div className="w-80 mx-2 relative">
            <div 
              className="w-full h-6 absolute -top-2 cursor-pointer"
              onClick={handleProgressBarClick}
            ></div>
            <input 
              type="range"
              min={0}
              max={0.999999}
              step="any"
              value={played}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          
          {/* Duration */}
          <span className="text-white text-sm font-medium">
            {formatTime(duration)}
          </span>
          
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="text-white p-2 rounded-full hover:bg-white/10"
            >
              {muted || volume === 0 ? (
                <SpeakerXMarkIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
            </button>
            
            <input 
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          
          {/* Fullscreen button */}
          <button 
            onClick={handleFullscreen}
            className="text-white p-2 rounded-full hover:bg-white/10"
          >
            <ArrowsPointingOutIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Title overlay - displayed above the controls */}
      <div className="text-white text-center mb-3 font-medium text-shadow">
        {episode ? (
          <span>
            {media.title} - {getFormattedEpisodeTitle()}
          </span>
        ) : (
          <span>{media.title}</span>
        )}
      </div>
    </div>
  </div>
);
}