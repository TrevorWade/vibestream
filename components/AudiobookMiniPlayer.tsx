import React from 'react';
import { RotateCcw, RotateCw, Play, Pause, Maximize2, X } from 'lucide-react';
import { Audiobook } from '../types';
import { Button } from './Button';
import { formatTime } from '../constants';

interface AudiobookMiniPlayerProps {
  book: Audiobook;
  isPlaying: boolean;
  progress: number;
  onTogglePlay: () => void;
  onJump: (deltaSeconds: number) => void;
  onExpand: () => void;
  onStop: () => void;
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
  onExpand,
  onStop,
}) => {
  const durationKnown = typeof book.duration === 'number' && Number.isFinite(book.duration) && book.duration > 0;
  const pct = durationKnown ? Math.max(0, Math.min(100, (Math.max(0, Math.min(progress, book.duration)) / book.duration) * 100)) : 0;

  return (
    <div className="h-20 bg-surface border-t border-white/5 px-4 flex items-center justify-between z-40 relative">
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

          <Button
            variant="icon"
            className="w-12 h-12 !bg-white !text-black rounded-full flex items-center justify-center shadow-xl"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={22} color="black" fill="black" /> : <Play size={22} color="black" fill="black" className="ml-0.5" />}
          </Button>

          <Button variant="icon" onClick={() => onJump(30)} title="Forward 30s">
            <RotateCw size={26} />
            <span className="absolute text-[9px] font-bold mt-1">30</span>
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-2 text-[10px] text-textSub font-mono mt-1">
          <span className="w-10 text-left">{formatTime(progress)}</span>
          <div className="flex-1 h-1 bg-surfaceHighlight rounded-full overflow-hidden">
            {durationKnown ? (
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            ) : (
              <div className="h-full bg-primary/40 animate-pulse" style={{ width: '100%' }} />
            )}
          </div>
          <span className="w-10 text-right">
            {(typeof book.duration === 'number' && Number.isFinite(book.duration) && book.duration > 0) ? formatTime(book.duration) : '--:--'}
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="w-1/3 flex justify-end items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onExpand} title="Open player">
          <Maximize2 size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onStop} title="Stop">
          <X size={18} />
        </Button>
      </div>
    </div>
  );
};

