import React, { useState } from 'react';
import { RotateCcw, RotateCw, Play, Pause, Maximize2, X, Volume2 } from 'lucide-react';
import { Audiobook } from '../types';
import { Button } from './Button';
import { formatTime } from '../constants';

interface AudiobookMiniPlayerProps {
  book: Audiobook;
  isPlaying: boolean;
  progress: number;
  onTogglePlay: () => void;
  onJump: (deltaSeconds: number) => void;
  onSeek: (time: number) => void;
  onExpand: () => void;
  onStop: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
}

/**
 * Bottom mini-player for audiobooks.
 * Visible whenever a book is active (playing or paused).
 */
export const AudiobookMiniPlayer: React.FC<AudiobookMiniPlayerProps> = ({
  book,
  isPlaying,
  progress,
  onTogglePlay,
  onJump,
  onSeek,
  onExpand,
  onStop,
  volume = 1,
  onVolumeChange,
}) => {
  const durationKnown = typeof book.duration === 'number' && Number.isFinite(book.duration) && book.duration > 0;
  const pct = durationKnown ? Math.max(0, Math.min(100, (Math.max(0, Math.min(progress, book.duration)) / book.duration) * 100)) : 0;
  const sliderValue = durationKnown ? Math.max(0, Math.min(progress, book.duration)) : 0;
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [showSeekConfirm, setShowSeekConfirm] = useState(false);

  const handleSeekInput = (value: number) => {
    if (!durationKnown) return;
    setPendingSeekTime(value);
    setShowSeekConfirm(true);
  };

  const confirmSeek = () => {
    if (pendingSeekTime != null) {
      onSeek(pendingSeekTime);
    }
    setShowSeekConfirm(false);
    setPendingSeekTime(null);
  };

  const cancelSeek = () => {
    setShowSeekConfirm(false);
    setPendingSeekTime(null);
  };

  return (
    <>
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:flex h-20 bg-surface border-t border-white/5 px-4 items-center justify-between z-40 relative">
        {/* Left: Book info */}
        <div className="flex items-center gap-4 w-1/3 min-w-0 cursor-pointer" onClick={onExpand}>
          <div className="w-14 h-14 rounded-md overflow-hidden bg-surfaceHighlight shadow-lg flex-shrink-0">
            {book.coverArt ? (
              <img src={book.coverArt} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surfaceHighlight" />
            )}
          </div>
          <div className="flex flex-col overflow-hidden justify-center">
            <span className="text-sm font-semibold text-white truncate hover:underline">{book.title}</span>
            <span className="text-xs text-textSub truncate">{book.author}</span>
          </div>
        </div>

        {/* Center: controls */}
        <div className="flex flex-col items-center max-w-md w-1/3 px-4">
          <div className="flex items-center gap-6">
            <Button variant="icon" onClick={() => onJump(-30)} title="Rewind 30s">
              <RotateCcw size={26} />
              <span className="absolute text-[9px] font-bold mt-1">30</span>
            </Button>

            <button
              className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              style={{ color: 'black' }}
            >
              {isPlaying ? (
                <Pause size={22} color="black" fill="black" />
              ) : (
                <Play size={22} color="black" fill="black" className="ml-0.5" />
              )}
            </button>

            <Button variant="icon" onClick={() => onJump(30)} title="Forward 30s">
              <RotateCw size={26} />
              <span className="absolute text-[9px] font-bold mt-1">30</span>
            </Button>
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-2 text-[10px] text-textSub font-mono mt-1">
            <span className="w-10 text-left">{formatTime(progress)}</span>
            <div className="flex-1 h-1 bg-surfaceHighlight rounded-full overflow-hidden relative">
              {durationKnown ? (
                <>
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  <input
                    type="range"
                    min={0}
                    max={book.duration}
                    value={sliderValue}
                    onChange={(e) => handleSeekInput(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </>
              ) : (
                <div className="h-full bg-primary/40 animate-pulse" style={{ width: '100%' }} />
              )}
            </div>
            <span className="w-10 text-right">
              {(typeof book.duration === 'number' && Number.isFinite(book.duration) && book.duration > 0)
                ? formatTime(book.duration)
                : '--:--'}
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="w-1/3 flex justify-end items-center gap-3">
          {/* Volume */}
          {onVolumeChange && (
            <div className="flex items-center gap-2 min-w-[120px]">
              <Volume2 size={18} className="text-textSub" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-24 h-1 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer accent-white hover:accent-secondary"
              />
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={onExpand} title="Open player">
            <Maximize2 size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onStop} title="Stop">
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div
        className="md:hidden h-16 bg-[#09090b] px-3 flex items-center justify-between z-40 relative"
        onClick={onExpand}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Cover Art */}
          <div className="w-10 h-10 rounded overflow-hidden bg-surfaceHighlight flex-shrink-0">
            {book.coverArt ? (
              <img src={book.coverArt} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surfaceHighlight" />
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col min-w-0 justify-center">
            <span className="text-sm font-bold text-white truncate leading-tight mb-0.5">{book.title}</span>
            <span className="text-xs text-textSub">
              {(() => {
                if (!durationKnown) return 'Loading...';
                const leftSeconds = Math.max(0, book.duration - progress);
                const h = Math.floor(leftSeconds / 3600);
                const m = Math.floor((leftSeconds % 3600) / 60);
                if (h > 0) return `${h}h ${m}m left`;
                return `${m}m left`;
              })()}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            className="w-10 h-10 flex items-center justify-center text-white relative hover:bg-white/10 rounded-full transition-colors"
            onClick={() => onJump(-30)}
          >
            <RotateCcw size={22} className="text-white" />
            <span className="absolute text-[8px] font-bold mt-[3px] text-white">30</span>
          </button>

          <button
            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            onClick={onTogglePlay}
          >
            {isPlaying ? (
              <Pause size={18} fill="black" />
            ) : (
              <Play size={18} fill="black" className="ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {showSeekConfirm && pendingSeekTime != null && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center px-6"
          onClick={cancelSeek}
        >
          <div
            className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold text-textMain">Jump to this position?</div>
            <div className="text-sm text-textSub mt-1">
              {formatTime(pendingSeekTime)}{' '}
              {durationKnown ? `of ${formatTime(book.duration)}` : ''}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="secondary" onClick={cancelSeek}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirmSeek}>
                Yes, jump
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

