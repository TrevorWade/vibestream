import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, MessageSquareQuote, Music, ListMusic } from 'lucide-react';
import { Track, PlayerState } from '../types';
import { PlayerControls } from './PlayerControls';
import { Button } from './Button';
import { fetchLyrics, parseLRC, getCurrentLyric, LyricLine } from '../services/lyrics';

interface FullPlayerProps {
  track: Track;
  playerState: PlayerState;
  onCollapse: () => void;
  controls: {
    togglePlay: () => void;
    next: () => void;
    prev: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    seek: (time: number) => void;
    toggleQueue: () => void;
  };
}

export const FullPlayer: React.FC<FullPlayerProps> = ({
  track,
  playerState,
  onCollapse,
  controls
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[] | null>(null);
  const [activeLine, setActiveLine] = useState<LyricLine | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const bgGradient = `linear-gradient(to bottom, ${playerState.isPlaying ? '#4c1d95' : '#1f2937'}, #121212)`;

  // Fetch lyrics when track changes
  useEffect(() => {
    let isMounted = true;

    const loadLyrics = async () => {
      // Reset state
      setSyncedLyrics(null);
      setActiveLine(null);

      if (!track) return;

      // If track already has local lyrics, use them (might be unsynced, but check if they look like LRC)
      if (track.lyrics) {
        // Simple heuristic: if it contains timestamp brackets, treat as synced
        if (/\[\d{2}:\d{2}\.\d{2}\]/.test(track.lyrics)) {
          setSyncedLyrics(parseLRC(track.lyrics));
        } else {
          // Plain text lyrics, no sync
          setSyncedLyrics(null);
        }
        return;
      }

      setLoadingLyrics(true);
      try {
        const rawLrc = await fetchLyrics(track.title, track.artist, track.album, track.duration);
        if (isMounted && rawLrc) {
          const parsed = parseLRC(rawLrc);
          setSyncedLyrics(parsed);
        }
      } catch (err) {
        console.error("Error loading lyrics", err);
      } finally {
        if (isMounted) setLoadingLyrics(false);
      }
    };

    loadLyrics();

    return () => { isMounted = false; };
  }, [track?.id, track?.title, track?.artist]);

  // Sync lyrics with progress
  useEffect(() => {
    if (syncedLyrics) {
      const current = getCurrentLyric(playerState.progress, syncedLyrics);
      if (current !== activeLine) {
        setActiveLine(current);
      }
    }
  }, [playerState.progress, syncedLyrics]);

  // Auto-scroll to active line
  useEffect(() => {
    if (showLyrics && activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [activeLine, showLyrics]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col transition-all duration-500 ease-in-out"
      style={{ background: bgGradient }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 mt-2">
        <Button variant="icon" onClick={onCollapse}>
          <ChevronDown size={28} />
        </Button>
        <span className="text-xs uppercase tracking-widest text-textSub">Now Playing</span>
        <Button variant="icon" onClick={() => setShowLyrics(!showLyrics)}>
          <MessageSquareQuote size={24} className={showLyrics ? "text-primary" : ""} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-center p-6 pb-24 space-y-8">

        {/* Album Art or Lyrics */}
        <div className="w-full max-w-md aspect-square relative shadow-2xl shadow-black/50 rounded-lg overflow-hidden transition-all duration-500">
          {!showLyrics ? (
            track.coverArt ? (
              <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surfaceHighlight flex items-center justify-center">
                <Music size={80} className="text-textSub opacity-20" />
              </div>
            )
          ) : (
            <div
              ref={lyricsContainerRef}
              className="w-full h-full bg-black/40 backdrop-blur-md p-6 overflow-y-auto rounded-lg border border-white/10 no-scrollbar"
            >
              {loadingLyrics ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-textSub animate-pulse">Searching for lyrics...</p>
                </div>
              ) : syncedLyrics && syncedLyrics.length > 0 ? (
                <div className="flex flex-col space-y-4 py-10 text-center">
                  {syncedLyrics.map((line, idx) => {
                    const isActive = activeLine === line;
                    return (
                      <div
                        key={idx}
                        ref={isActive ? activeLineRef : null}
                        className={`transition-all duration-300 px-2 rounded-lg ${isActive ? 'scale-105 origin-center' : ''}`}
                      >
                        <p
                          className={`text-lg transition-colors duration-300 ${isActive
                              ? 'text-white font-bold drop-shadow-md'
                              : 'text-textSub/60 hover:text-textSub/80'
                            }`}
                        >
                          {line.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : track.lyrics ? (
                // Fallback to local unsynced lyrics
                <div className="whitespace-pre-wrap text-lg leading-relaxed font-medium text-textMain/90">
                  {track.lyrics}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <p className="text-textSub">No lyrics found.</p>
                  <p className="text-xs text-textSub/50">Could not find lyrics on LRCLIB or locally.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="w-full max-w-md flex items-center justify-between">
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-2xl font-bold truncate text-textMain">{track.title}</h2>
            <p className="text-lg text-textSub truncate">{track.artist || 'Unknown Artist'}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md space-y-2">
          <input
            type="range"
            min={0}
            max={track.duration || 100}
            value={playerState.progress}
            onChange={(e) => controls.seek(Number(e.target.value))}
            className="w-full h-1 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer accent-white hover:accent-secondary"
          />
          <div className="flex justify-between text-xs text-textSub font-mono">
            <span>{Math.floor(playerState.progress / 60)}:{Math.floor(playerState.progress % 60).toString().padStart(2, '0')}</span>
            <span>{Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Controls */}
        <PlayerControls
          size="large"
          isPlaying={playerState.isPlaying}
          onPlayPause={controls.togglePlay}
          onNext={controls.next}
          onPrev={controls.prev}
          shuffleMode={playerState.shuffleMode}
          onToggleShuffle={controls.toggleShuffle}
          repeatMode={playerState.repeatMode}
          onToggleRepeat={controls.toggleRepeat}
        />

        {/* Play Count Stats */}
        <div className="text-xs text-textSub tracking-wide bg-surface/50 px-3 py-1 rounded-full mb-8">
          Played {track.playCount} times
        </div>

      </div>

      {/* Bottom Right Queue Button */}
      <div className="absolute right-6 bottom-8 z-30">
        <Button
          variant="secondary"
          className="shadow-xl bg-[#282828] text-white hover:bg-[#3E3E3E] !p-3 rounded-full"
          onClick={controls.toggleQueue}
        >
          <ListMusic size={24} />
          <span className="sr-only">Queue</span>
        </Button>
      </div>

    </div>
  );
};