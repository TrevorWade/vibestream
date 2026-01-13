import React, { useEffect, useMemo, useState } from 'react';
import { 
  ChevronDown, RotateCcw, RotateCw, SkipBack, SkipForward, 
  Play, Pause, List, Gauge, Bookmark as BookmarkIcon, Plus, 
  Trash2, X, Clock, BookOpen
} from 'lucide-react';
import { Audiobook, Bookmark } from '../types';
import { Button } from './Button';
import { 
  saveBookmark, 
  getBookmarks, 
  deleteBookmark
} from '../services/audiobookService';
import { formatTime } from '../constants';

// --- tiny helpers (keep scrubbers stable) ---
function isValidDuration(d: unknown): d is number {
  return typeof d === 'number' && Number.isFinite(d) && d > 0;
}
function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
function pctFrom(progress: number, duration: number): number {
  return clamp01(progress / duration) * 100;
}

interface AudiobookPlayerProps {
  book: Audiobook;
  isPlaying: boolean;
  progress: number;
  speed: number;
  onCollapse: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onJump: (deltaSeconds: number) => void;
  onSetSpeed: (speed: number) => void;
}

export const AudiobookPlayer: React.FC<AudiobookPlayerProps> = ({
  book,
  isPlaying,
  progress,
  speed,
  onCollapse,
  onTogglePlay,
  onSeek,
  onJump,
  onSetSpeed,
}) => {
  const [showChapters, setShowChapters] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pendingScrubTime, setPendingScrubTime] = useState<number | null>(null);
  const [showScrubConfirm, setShowScrubConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await getBookmarks(book.id);
        if (!cancelled) setBookmarks(saved);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [book.id]);

  const currentChapterIndex = useMemo(() => {
    return book.chapters.reduce((acc, ch, idx) => {
      if (progress >= ch.startTime) return idx;
      return acc;
    }, 0);
  }, [book.chapters, progress]);

  const durationKnown = isValidDuration(book.duration);
  const scrubberMax = durationKnown ? book.duration : 1;
  const scrubberValue = durationKnown ? Math.max(0, Math.min(progress, book.duration)) : 0;
  const scrubberPct = durationKnown ? pctFrom(scrubberValue, book.duration) : 0;
  const remaining = durationKnown ? Math.max(0, book.duration - progress) : null;

  const nextChapter = () => {
    if (currentChapterIndex < book.chapters.length - 1) {
      onSeek(book.chapters[currentChapterIndex + 1].startTime);
    }
  };

  const prevChapter = () => {
    if (progress - book.chapters[currentChapterIndex].startTime > 3) {
      onSeek(book.chapters[currentChapterIndex].startTime);
    } else if (currentChapterIndex > 0) {
      onSeek(book.chapters[currentChapterIndex - 1].startTime);
    }
  };

  const addBookmark = async () => {
    const bookmark: Bookmark = {
      id: `bm-${Date.now()}`,
      bookId: book.id,
      timestamp: progress,
      createdAt: Date.now(),
      note: `Bookmark at ${formatTime(progress)}`
    };
    await saveBookmark(bookmark);
    setBookmarks(prev => [...prev, bookmark].sort((a, b) => a.timestamp - b.timestamp));
  };

  const removeBookmark = async (id: string) => {
    await deleteBookmark(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const handleSpeedChange = (newSpeed: number) => {
    onSetSpeed(newSpeed);
    setShowSpeedMenu(false);
  };

  return (
    <div className="fixed inset-0 z-[100] h-[100dvh] bg-[#121212] overflow-hidden flex flex-col">
      {/* Header - Fixed height */}
      <div className="w-full flex items-center justify-between px-4 py-3 shrink-0">
        <Button variant="icon" onClick={onCollapse}>
          <ChevronDown size={28} className="text-white" />
        </Button>
        <div className="text-center flex flex-col min-w-0 flex-1 px-2">
          <span className="text-[10px] uppercase tracking-widest text-textSub font-bold">Now Playing</span>
          <span className="text-sm font-medium text-white truncate">{book.title}</span>
        </div>
        <Button variant="icon" onClick={() => setShowBookmarks(true)}>
          <BookmarkIcon size={24} className="text-white" />
        </Button>
      </div>

      {/* Main Content Grid - NO SCROLL */}
      <div className="flex-1 w-full overflow-hidden flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md flex flex-col items-center space-y-4">
          
          {/* Cover Art - Constrained */}
          <div className="w-full max-w-[85vw] max-h-[45vh] aspect-square mx-auto">
            <div className="w-full h-full relative shadow-2xl shadow-black/80 rounded-xl overflow-hidden bg-surfaceHighlight">
              {book.coverArt ? (
                <img src={book.coverArt} alt={book.title} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={80} className="text-textSub opacity-10" />
                </div>
              )}
            </div>
          </div>

          {/* Title + Author */}
          <div className="w-full text-center space-y-1 px-2">
            <h2 className="text-lg md:text-xl font-bold text-white line-clamp-2">{book.title}</h2>
            <p className="text-sm md:text-base text-textSub truncate">{book.author}</p>
          </div>

          {/* Chapter Badge */}
          <button 
            className="flex items-center gap-2 text-primary font-bold px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            onClick={() => setShowChapters(true)}
          >
            <List size={16} />
            <span className="text-xs uppercase tracking-wide">
              {book.chapters[currentChapterIndex]?.title || `Chapter ${currentChapterIndex + 1}`}
            </span>
          </button>

          {/* Scrubber */}
          <div className="w-full space-y-2 px-2">
            <div className="relative h-1 w-full bg-white/20 rounded-full">
              <input
                type="range"
                min={0}
                max={scrubberMax}
                value={pendingScrubTime != null ? pendingScrubTime : scrubberValue}
                onChange={(e) => setPendingScrubTime(Number(e.target.value))}
                onPointerUp={() => {
                  if (!durationKnown || pendingScrubTime == null) return;
                  if (Math.abs(pendingScrubTime - scrubberValue) < 1) {
                    setPendingScrubTime(null);
                    return;
                  }
                  setShowScrubConfirm(true);
                }}
                disabled={!durationKnown}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {durationKnown ? (
                <>
                  <div 
                    className="absolute h-full bg-primary rounded-full transition-all"
                    style={{ width: `${scrubberPct}%` }}
                  />
                  <div 
                    className="absolute h-3 w-3 bg-primary rounded-full -top-1 -ml-1.5 pointer-events-none shadow-lg"
                    style={{ left: `${scrubberPct}%` }}
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-primary/30 rounded-full animate-pulse" />
              )}
            </div>
            <div className="flex justify-between text-xs font-medium text-textSub font-mono px-1">
              <span>{formatTime(durationKnown ? scrubberValue : progress)}</span>
              <span>{remaining == null ? '--:--' : `-${formatTime(remaining)}`}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full flex items-center justify-between px-1">
            <Button variant="icon" onClick={prevChapter}>
              <SkipBack size={28} className="text-white" />
            </Button>
            
            <div className="flex items-center gap-3">
              <Button variant="icon" onClick={() => onJump(-30)}>
                <div className="relative">
                  <RotateCcw size={36} className="text-white" />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white mt-1">30</span>
                </div>
              </Button>

              <Button 
                className="w-20 h-20 !bg-white !text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-2xl shrink-0"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause size={36} color="black" fill="black" />
                ) : (
                  <Play size={36} color="black" fill="black" className="ml-1" />
                )}
              </Button>

              <Button variant="icon" onClick={() => onJump(30)}>
                <div className="relative">
                  <RotateCw size={36} className="text-white" />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white mt-1">30</span>
                </div>
              </Button>
            </div>

            <Button variant="icon" onClick={nextChapter}>
              <SkipForward size={28} className="text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar - Fixed */}
      <div className="w-full border-t border-white/5 bg-[#181818] p-2 shrink-0">
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          <Button 
            variant="icon" 
            className="flex flex-col items-center gap-1 py-2"
            onClick={() => setShowSpeedMenu(true)}
          >
            <Gauge size={22} className={speed !== 1 ? "text-primary" : "text-white"} />
            <span className="text-[9px] font-bold uppercase tracking-tight">Speed {speed}x</span>
          </Button>

          <Button 
            variant="icon" 
            className="flex flex-col items-center gap-1 py-2"
            onClick={() => setShowChapters(true)}
          >
            <List size={22} className="text-white" />
            <span className="text-[9px] font-bold uppercase tracking-tight">Chapters</span>
          </Button>

          <Button 
            variant="icon" 
            className="flex flex-col items-center gap-1 py-2"
            onClick={addBookmark}
          >
            <Plus size={22} className="text-white" />
            <span className="text-[9px] font-bold uppercase tracking-tight">+ Clip</span>
          </Button>
        </div>
      </div>

      {/* Modals/Overlays */}
      {showSpeedMenu && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-end" onClick={() => setShowSpeedMenu(false)}>
          <div className="w-full bg-surface rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Playback Speed</h3>
              <Button variant="icon" onClick={() => setShowSpeedMenu(false)}><X /></Button>
            </div>
            <div className="grid grid-cols-4 gap-3 pb-6">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0].map(s => (
                <Button 
                  key={s}
                  variant={speed === s ? 'primary' : 'secondary'}
                  onClick={() => handleSpeedChange(s)}
                  className="py-3 font-bold"
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showScrubConfirm && pendingScrubTime != null && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center px-6"
          onClick={() => {
            setShowScrubConfirm(false);
            setPendingScrubTime(null);
          }}
        >
          <div
            className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold text-textMain">Jump to this position?</div>
            <div className="text-sm text-textSub mt-1">
              {formatTime(pendingScrubTime)} {durationKnown ? `of ${formatTime(book.duration)}` : ''}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowScrubConfirm(false);
                  setPendingScrubTime(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const target = pendingScrubTime;
                  setShowScrubConfirm(false);
                  setPendingScrubTime(null);
                  onSeek(target);
                }}
              >
                Yes, jump
              </Button>
            </div>
          </div>
        </div>
      )}

      {showChapters && (
        <div className="fixed inset-0 z-[110] bg-[#121212] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
            <Button variant="icon" onClick={() => setShowChapters(false)}><X size={28} /></Button>
            <h3 className="text-xl font-bold">Chapters</h3>
            <div className="w-10" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {book.chapters.map((ch, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${idx === currentChapterIndex ? 'bg-primary text-white' : 'hover:bg-white/5 text-textSub'}`}
                onClick={() => {
                  onSeek(ch.startTime);
                  setShowChapters(false);
                }}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold truncate">{ch.title}</span>
                  <span className="text-xs opacity-70">{formatTime(ch.startTime)}</span>
                </div>
                {idx === currentChapterIndex && <div className="w-2 h-2 bg-white rounded-full ml-2 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {showBookmarks && (
        <div className="fixed inset-0 z-[110] bg-[#121212] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
            <Button variant="icon" onClick={() => setShowBookmarks(false)}><X size={28} /></Button>
            <h3 className="text-xl font-bold">Your Bookmarks</h3>
            <div className="w-10" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30">
                <BookmarkIcon size={64} />
                <p className="mt-4">No bookmarks yet</p>
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div 
                  key={bm.id}
                  className="bg-surface p-4 rounded-2xl flex items-center justify-between group"
                >
                  <div 
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => {
                      onSeek(bm.timestamp);
                      setShowBookmarks(false);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={14} className="text-primary shrink-0" />
                      <span className="text-lg font-bold text-white">{formatTime(bm.timestamp)}</span>
                    </div>
                    <p className="text-sm text-textSub truncate">{bm.note}</p>
                    <span className="text-[10px] text-textSub/50 uppercase font-bold tracking-tighter">
                      {new Date(bm.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button variant="icon" onClick={() => removeBookmark(bm.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                    <Trash2 size={20} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
