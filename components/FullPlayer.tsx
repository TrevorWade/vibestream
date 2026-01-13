import React, { useState } from 'react';
import { ChevronDown, MessageSquareQuote, Music } from 'lucide-react';
import { Track, PlayerState } from '../types';
import { PlayerControls } from './PlayerControls';
import { Button } from './Button';

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
  };
}

export const FullPlayer: React.FC<FullPlayerProps> = ({
  track,
  playerState,
  onCollapse,
  controls
}) => {
  const [showLyrics, setShowLyrics] = useState(false);

  const bgGradient = `linear-gradient(to bottom, ${playerState.isPlaying ? '#4c1d95' : '#1f2937'}, #121212)`;

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
            <div className="w-full h-full bg-black/40 backdrop-blur-md p-6 overflow-y-auto rounded-lg border border-white/10">
              {track.lyrics ? (
                <div className="whitespace-pre-wrap text-lg leading-relaxed font-medium text-textMain/90">
                  {track.lyrics}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <p className="text-textSub">No lyrics available locally.</p>
                  <p className="text-xs text-textSub/50">Ensure a .lrc or .txt file with the same name exists in the folder.</p>
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
        <div className="text-xs text-textSub tracking-wide bg-surface/50 px-3 py-1 rounded-full">
          Played {track.playCount} times
        </div>

      </div>
    </div>
  );
};