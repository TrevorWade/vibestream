import React from 'react';
import { MoreHorizontal, Play } from 'lucide-react';
import { Track } from '../types';
import { formatTime } from '../constants';

/**
 * Mobile-friendly track row (Spotify-inspired).
 *
 * Differences from `TrackRow`:
 * - Much simpler: cover + title + artist + duration + overflow button
 * - Larger tap targets and fewer columns
 */
export function MobileTrackRow(props: {
  track: Track;
  isPlaying: boolean;
  onPlay: () => void;
  onMore?: () => void;
}) {
  const { track, isPlaying, onPlay, onMore } = props;

  return (
    <div
      className={[
        'flex items-center gap-3',
        'py-2',
        'rounded-tile',
        'hover:bg-white/5 transition-colors',
      ].join(' ')}
    >
      <button
        type="button"
        className="w-12 h-12 rounded-tile overflow-hidden bg-surfaceHighlight flex-shrink-0 relative"
        onClick={onPlay}
        title={isPlaying ? 'Playing' : 'Play'}
      >
        {track.coverArt ? (
          <img src={track.coverArt} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
        {isPlaying ? (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <Play size={18} fill="white" className="text-white ml-0.5" />
          </div>
        ) : null}
      </button>

      <button type="button" className="flex-1 min-w-0 text-left" onClick={onPlay}>
        <div className={['text-sm font-semibold truncate', isPlaying ? 'text-accent' : 'text-textMain'].join(' ')}>
          {track.title}
        </div>
        <div className="text-xs text-textSub truncate">{track.artist}</div>
      </button>

      <div className="hidden sm:block text-[11px] text-textSub font-mono">
        {track.duration ? formatTime(track.duration) : '--:--'}
      </div>

      <button
        type="button"
        className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-textSub"
        onClick={onMore}
        title="More"
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}

