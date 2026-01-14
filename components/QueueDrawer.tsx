import React, { useEffect, useState, useRef } from 'react';
import { GripVertical, Check, Trash2, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Track } from '../types';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nowPlaying?: Track;
  upNextItems: Track[];
  upcomingItems: Track[];
  contextName?: string;
  onPlay: (trackId: string) => void;
  onClearUpNext: () => void;
  onRemoveFromQueue: (trackId: string) => void;
  onAddToUpNext: (trackId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onReorderUpcoming: (fromIndex: number, toIndex: number) => void;
}

interface SwipeableRowProps {
  track: Track;
  isUpNext?: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onAddToUpNext: () => void;
  dragHandleProps?: any;
}

const SwipeableRow: React.FC<SwipeableRowProps> = ({ track, isUpNext, onPlay, onRemove, onAddToUpNext, dragHandleProps }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const threshold = 80;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    // Determine if scrolling vertically or swiping horizontally
    const diffX = currentX - startX.current;
    const diffY = Math.abs(currentY - startY.current);

    // If vertical scroll is dominant, don't swipe
    if (diffY > Math.abs(diffX)) return;

    if (diffX > 0) {
      setOffsetX(Math.min(diffX, 150));
    } else {
      setOffsetX(Math.max(diffX, -150));
    }
  };

  const onTouchEnd = () => {
    if (Math.abs(offsetX) > threshold) {
      if (offsetX > 0) {
        onAddToUpNext();
      } else {
        onRemove();
      }
    }
    setOffsetX(0);
    startX.current = null;
    startY.current = null;
  };

  // Background color based on swipe direction
  const bgStyle = offsetX > 0
    ? { backgroundColor: '#22c55e' } // Green
    : offsetX < 0
      ? { backgroundColor: '#ef4444' } // Red
      : { backgroundColor: 'transparent' };

  return (
    <div className="relative overflow-hidden mb-2 rounded-md h-16 select-none touch-pan-y group bg-transparent">
      {/* Background Actions */}
      <div
        className="absolute inset-0 flex items-center justify-between px-4 transition-colors rounded-md"
        style={bgStyle}
      >
        <div className={`flex items-center gap-2 text-black font-bold ${offsetX > 0 ? 'opacity-100' : 'opacity-0'}`}>
          <Check size={20} />
          <span>Play Next</span>
        </div>
        <div className={`flex items-center gap-2 text-white font-bold ${offsetX < 0 ? 'opacity-100' : 'opacity-0'}`}>
          <span>Remove</span>
          <Trash2 size={20} />
        </div>
      </div>

      {/* Foreground Content */}
      <div
        className="absolute inset-0 bg-[#282828] flex items-center justify-between px-3 transition-transform rounded-md border border-white/5"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          if (Math.abs(offsetX) === 0) onPlay();
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-sm overflow-hidden bg-surfaceHighlight shrink-0">
            {track.coverArt ? (
              <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/10">
                <span className="text-[8px]">N/A</span>
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className={`text-sm font-bold truncate ${isUpNext ? 'text-primary' : 'text-white'}`}>
              {track.title}
            </div>
            <div className="text-xs text-textSub truncate">
              {track.artist}
            </div>
          </div>
        </div>

        {/* Desktop Quick Actions */}
        <div className="hidden md:flex items-center gap-1 mr-2">
          {!isUpNext && (
            <button
              className="p-1.5 text-textSub hover:text-white rounded-full hover:bg-white/10"
              title="Play Next"
              onClick={(e) => {
                e.stopPropagation();
                onAddToUpNext();
              }}
            >
              <Plus size={16} />
            </button>
          )}
          <button
            className="p-1.5 text-textSub hover:text-red-400 rounded-full hover:bg-white/10"
            title="Remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Drag Handle */}
        {dragHandleProps ? (
          <div
            className="text-textSub/50 p-2 cursor-grab active:cursor-grabbing hover:text-white touch-none"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            {...dragHandleProps}
          >
            <GripVertical size={20} />
          </div>
        ) : (
          <div className="w-8 ml-2" />
        )}
      </div>
    </div>
  );
};

// Sortable Wrapper
interface SortableQueueItemProps {
  id: string;
  track: Track;
  isUpNext?: boolean;
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
  onAddToUpNext: (id: string) => void;
}

const SortableQueueItem: React.FC<SortableQueueItemProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SwipeableRow
        track={props.track}
        isUpNext={props.isUpNext}
        onPlay={() => props.onPlay(props.track.id)}
        onRemove={() => props.onRemove(props.track.id)}
        onAddToUpNext={() => props.onAddToUpNext(props.track.id)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  nowPlaying,
  upNextItems,
  upcomingItems,
  contextName,
  onPlay,
  onClearUpNext,
  onRemoveFromQueue,
  onAddToUpNext,
  onReorder,
  onReorderUpcoming
}) => {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const MAX_ITEMS = 50;

  const displayedUpcoming = upcomingItems.slice(0, MAX_ITEMS);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    // Check UpNext
    const oldUpNextIndex = upNextItems.findIndex((item) => item.id === active.id);
    const newUpNextIndex = upNextItems.findIndex((item) => item.id === over.id);

    if (oldUpNextIndex !== -1 && newUpNextIndex !== -1) {
      onReorder(oldUpNextIndex, newUpNextIndex);
      return;
    }

    // Check Upcoming
    const oldUpcomingIndex = displayedUpcoming.findIndex((item) => item.id === active.id);
    const newUpcomingIndex = displayedUpcoming.findIndex((item) => item.id === over.id);

    if (oldUpcomingIndex !== -1 && newUpcomingIndex !== -1) {
      onReorderUpcoming(oldUpcomingIndex, newUpcomingIndex);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[70] h-[65vh] bg-[#121212] rounded-t-3xl border-t border-white/10 flex flex-col shadow-2xl transition-transform duration-300 transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle Bar */}
        <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 pt-2 shrink-0">
          <h2 className="text-xl font-bold text-white">Queue</h2>
          {nowPlaying && (
            <div className="text-sm text-textSub truncate mt-1">
              Playing from {contextName || nowPlaying.album || 'Library'}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >

            {/* Now Playing Section */}
            {nowPlaying && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-textSub uppercase tracking-wider">Now Playing</h3>
                <div
                  className="flex items-center gap-3 p-2 rounded-md bg-white/5 border border-primary/30"
                  onClick={() => onClose()}
                >
                  <div className="w-10 h-10 rounded-sm overflow-hidden bg-surfaceHighlight shrink-0 relative">
                    {nowPlaying.coverArt && (
                      <img src={nowPlaying.coverArt} alt={nowPlaying.title} className="w-full h-full object-cover opacity-60" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-pulse w-3 h-3 bg-primary rounded-full" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-primary truncate">{nowPlaying.title}</div>
                    <div className="text-xs text-textSub truncate">{nowPlaying.artist}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Up Next (User Queued) */}
            {upNextItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider">Next in Queue</h3>
                  <button onClick={onClearUpNext} className="text-[10px] uppercase font-bold text-textSub hover:text-white border px-2 py-0.5 rounded-full border-white/10">Clear</button>
                </div>
                <SortableContext
                  items={upNextItems.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {upNextItems.map(t => (
                      <SortableQueueItem
                        key={t.id}
                        id={t.id}
                        track={t}
                        isUpNext={true}
                        onPlay={onPlay}
                        onRemove={onRemoveFromQueue}
                        onAddToUpNext={() => { }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}

            {/* Upcoming (Auto Queued) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-textSub uppercase tracking-wider">Next from: {contextName || nowPlaying?.album || 'Context'}</h3>

              <SortableContext
                items={displayedUpcoming.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {displayedUpcoming.length === 0 ? (
                    <div className="text-center text-textSub text-sm py-4">End of queue</div>
                  ) : (
                    displayedUpcoming.map(t => (
                      <SortableQueueItem
                        key={`upcoming-${t.id}`}
                        id={t.id}
                        track={t}
                        onPlay={onPlay}
                        onRemove={onRemoveFromQueue}
                        onAddToUpNext={onAddToUpNext}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>

          </DndContext>
        </div>
      </div>
    </>
  );
};
