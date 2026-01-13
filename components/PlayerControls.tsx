import React from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1
} from 'lucide-react';
import { Button } from './Button';
import { ShuffleMode, RepeatMode } from '../types';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  shuffleMode: ShuffleMode;
  onToggleShuffle: () => void;
  repeatMode: RepeatMode;
  onToggleRepeat: () => void;
  size?: 'small' | 'large';
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  shuffleMode,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  size = 'small'
}) => {
  const isLarge = size === 'large';

  const getShuffleIconColor = () => {
    if (shuffleMode === ShuffleMode.TRUE) return 'text-secondary';
    if (shuffleMode === ShuffleMode.SMART) return 'text-primary';
    return 'text-textSub';
  };

  return (
    <div className={`flex items-center ${isLarge ? 'justify-center gap-8 w-full max-w-sm px-4' : 'gap-4'}`}>
      <Button
        variant="icon"
        size="icon"
        onClick={onToggleShuffle}
        className={getShuffleIconColor()}
        title={`Shuffle: ${shuffleMode}`}
      >
        <Shuffle size={isLarge ? 24 : 18} />
        {shuffleMode === ShuffleMode.SMART && (
          <span className="absolute text-[8px] font-bold mt-[2px] ml-[1px] text-primary">S</span>
        )}
      </Button>

      <Button variant="icon" size="icon" onClick={onPrev}>
        <SkipBack size={isLarge ? 32 : 24} className="fill-current" />
      </Button>

      <Button
        variant={isLarge ? 'primary' : 'icon'}
        size={isLarge ? 'icon' : 'icon'}
        className={`${isLarge ? 'w-16 h-16 !p-0 flex items-center justify-center bg-white text-black hover:bg-gray-200' : 'bg-white text-black rounded-full p-1 hover:scale-105'}`}
        onClick={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
      >
        {isPlaying ? (
          <Pause size={isLarge ? 32 : 20} className="fill-current" />
        ) : (
          <Play size={isLarge ? 32 : 20} className="fill-current ml-1" />
        )}
      </Button>

      <Button variant="icon" size="icon" onClick={onNext}>
        <SkipForward size={isLarge ? 32 : 24} className="fill-current" />
      </Button>

      <Button
        variant="icon"
        size="icon"
        onClick={onToggleRepeat}
        active={repeatMode !== RepeatMode.OFF}
      >
        {repeatMode === RepeatMode.ONE ? <Repeat1 size={isLarge ? 24 : 18} /> : <Repeat size={isLarge ? 24 : 18} />}
      </Button>
    </div>
  );
};
