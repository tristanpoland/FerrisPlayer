'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactPlayer from 'react-player';
import { getMediaById, getMediaStreamUrl, updateWatchProgress } from '@/lib/api';
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
  const searchParams = useSearchParams();
  const episodeId = searchParams.get('episode');
  
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
  
  const playerRef = useRef<ReactPlayer>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get media details
        const mediaData = await getMediaById(id);
        setMedia(mediaData);
        
        // If there's an episode ID, we would fetch that too
        // This would require an additional API endpoint in your backend
        // For now, we'll just use a placeholder
        if (episodeId) {
          // This is a placeholder; you'd implement a getEpisodeById function
          // setEpisode(await getEpisodeById(episodeId));
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
  }, [id, episodeId]);
  
  // Save progress periodically
  useEffect(() => {
    const saveProgressInterval = setInterval(() => {
      if (playerRef.current && !seeking && played > 0 && duration > 0) {
        const currentTime = Math.floor(played * duration);
        saveProgress(currentTime);
      }
    }, 10000); // Save every 10 seconds
    
    return () => {
      clearInterval(saveProgressInterval);
    };
  }, [played, duration, seeking]);
  
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
    if (!seeking) {
      setPlayed(state.played);
    }
  };
  
  const handleDuration = (duration: number) => {
    setDuration(duration);
  };
  
  const handleSeekMouseDown = () => {
    setSeeking(true);
  };
  
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };
  
  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(parseFloat((e.target as HTMLInputElement).value));
    }
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
  
  if (loading) {
    return <LoadingSpinner title={''} children={undefined} />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  if (!media) {
    return <ErrorMessage message="Media not found" />;
  }
  
  return (
    <div className="-mx-6 -mt-6 h-screen bg-black relative" id="video-container">
      {/* Video Player */}
      <ReactPlayer
        ref={playerRef}
        url={getMediaStreamUrl(id)} // This would be different for episodes
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
      
      {/* Custom Controls */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <button 
            onClick={() => window.history.back()}
            className="text-white hover:text-primary flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>
        
        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress bar */}
          <div className="mb-4 px-4">
            <input 
              type="range"
              min={0}
              max={0.999999}
              step="any"
              value={played}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>{formatTime(played * duration)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-full hover:bg-white/10"
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIcon className="w-6 h-6" />
                )}
              </button>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleMute}
                  className="p-2 rounded-full hover:bg-white/10"
                >
                  {muted || volume === 0 ? (
                    <SpeakerXMarkIcon className="w-6 h-6" />
                  ) : (
                    <SpeakerWaveIcon className="w-6 h-6" />
                  )}
                </button>
                
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-24 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm">
                {episode ? (
                  <span>
                    {media.title} - S{episode.season_id} E{episode.episode_number}: {episode.title}
                  </span>
                ) : (
                  <span>{media.title}</span>
                )}
              </div>
              
              <button 
                onClick={handleFullscreen}
                className="p-2 rounded-full hover:bg-white/10"
              >
                <ArrowsPointingOutIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}