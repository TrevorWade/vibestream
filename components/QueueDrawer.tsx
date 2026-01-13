import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Track } from '../types';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nowPlaying?: Track;
  upNextItems: Track[];
  upcomingItems: Track[];
  onPlay: (trackId: string) => void;
  onClearUpNext: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  nowPlaying,
  upNextItems,
  upcomingItems,
  onPlay,
  onClearUpNext
}) => {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
    <div className="flex items-center justify-between mb-3 mt-6">
      <h3 className="text-sm font-bold uppercase text-textMain">{title}</h3>
      {right}
    </div>
  );

  const Row: React.FC<{ t: Track }> = ({ t }) => (
    <div 
      className="flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer"
      onClick={() => onPlay(t.id)}
    >
      <img src={t.coverArt} alt={t.title} className="w-12 h-12 rounded-sm object-cover bg-surfaceHighlight" />
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate text-textMain">{t.title}</div>
        <div className="text-xs truncate text-textSub">{t.artist}</div>
      </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'} md:pointer-events-none`}>
      {/* Backdrop overlays only on mobile; on desktop it's transparent and non-blocking */}
      <div 
        className={`absolute inset-0 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'} bg-black/60 md:bg-transparent md:pointer-events-none`}
        onClick={onClose}
      />
      <aside 
        className={`absolute right-0 top-0 h-full w-[360px] bg-surface border-l border-white/10 p-4 overflow-y-auto transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:pointer-events-auto`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Queue</h2>
          <button className="text-textSub hover:text-textMain" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Now Playing */}
        {nowPlaying && (
          <>
            <div className="text-sm font-bold text-textSub mb-2">Now playing</div>
            <Row t={nowPlaying} />
          </>
        )}

        {/* Up Next */}
        <SectionHeader 
          title="Next in queue"
          right={
            upNextItems.length > 0 ? (
              <button className="text-xs text-textSub hover:text-textMain" onClick={onClearUpNext}>
                Clear queue
              </button>
            ) : null
          }
        />
        {upNextItems.length === 0 ? (
          <div className="text-xs text-textSub">No songs queued next.</div>
        ) : (
          <div className="space-y-1">
            {upNextItems.map(t => <Row key={t.id} t={t} />)}
          </div>
        )}

        {/* Upcoming */}
        <SectionHeader title="Next from: Queue" />
        {upcomingItems.length === 0 ? (
          <div className="text-xs text-textSub">No upcoming songs.</div>
        ) : (
          <div className="space-y-1">
            {upcomingItems.map(t => <Row key={t.id} t={t} />)}
          </div>
        )}
      </aside>
    </div>
  );
};


