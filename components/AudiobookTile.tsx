import React, { useMemo, useState } from 'react';
import { BookOpen, MoreVertical, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './Button';

type ImportStatus = 'pending' | 'processing' | 'done' | 'error';

interface AudiobookTileProps {
  title: string;
  author?: string;
  coverArt?: string;
  onClick?: () => void;

  // Normal library progress (listening progress)
  progressPercent?: number; // 0..100

  // Import UI (ghost cover + fill animation)
  importStatus?: ImportStatus;
  importProgress?: number; // 0..100

  // Optional menu actions
  onRemove?: () => void;
  
  // Refresh button (for when auto-reload failed)
  needsRefresh?: boolean;
  onRefresh?: () => void;
}

/**
 * Renders a single audiobook cover tile.
 * - In library mode it shows a listening-progress bar.
 * - In import mode it shows a ghost cover + a fill animation while metadata is loading.
 */
export const AudiobookTile: React.FC<AudiobookTileProps> = ({
  title,
  author,
  coverArt,
  onClick,
  progressPercent,
  importStatus,
  importProgress,
  onRemove,
  needsRefresh,
  onRefresh,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const isImporting = !!importStatus && importStatus !== 'done';
  const fill = typeof importProgress === 'number' ? Math.max(0, Math.min(100, importProgress)) : 0;

  const showMenu = !!onRemove && !isImporting;

  // We create a “ghost” visual once we have cover art but we’re still importing.
  const coverClass = useMemo(() => {
    if (isImporting && coverArt) return 'opacity-40 blur-[1px] saturate-75';
    return '';
  }, [isImporting, coverArt]);

  return (
    <div className="group flex flex-col space-y-3 min-w-0">
      <div
        className={`aspect-square relative rounded-lg overflow-hidden shadow-lg transition-transform duration-300 ${onClick ? 'cursor-pointer group-hover:scale-105 group-hover:shadow-2xl' : ''}`}
        onClick={() => {
          if (menuOpen) return;
          onClick?.();
        }}
      >
        {coverArt ? (
          <img src={coverArt} alt={title} className={`w-full h-full object-cover ${coverClass}`} />
        ) : (
          <div className="w-full h-full bg-surfaceHighlight flex items-center justify-center">
            <BookOpen size={48} className="text-textSub opacity-20" />
          </div>
        )}

        {/* Import fill animation: we dark-mask the cover and “reveal” it as progress increases */}
        {isImporting && (
          <>
            <div
              className="absolute inset-0 bg-black/55 transition-[clip-path] duration-500"
              style={{
                // Reveal from bottom -> top as fill increases
                clipPath: `inset(0 0 ${Math.max(0, 100 - fill)}% 0)`,
              }}
            />
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full">
              <Loader2 size={14} className="animate-spin text-white" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                {importStatus === 'pending' ? 'Queued' : 'Loading'}
              </span>
            </div>
          </>
        )}

        {/* Error badge */}
        {importStatus === 'error' && (
          <div className="absolute top-3 left-3 bg-red-600/70 backdrop-blur-md px-3 py-1 rounded-full">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Error</span>
          </div>
        )}

        {/* Refresh button overlay (for failed auto-reloads) */}
        {needsRefresh && onRefresh && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className="p-3 rounded-full bg-primary hover:bg-primary/80 transition-colors shadow-lg"
              title="Refresh audiobook"
            >
              <RefreshCw size={24} className="text-white" />
            </button>
            <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
              Tap to Refresh
            </span>
          </div>
        )}

        {/* Library progress bar */}
        {typeof progressPercent === 'number' && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
            <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
          </div>
        )}

        {/* Tile menu (remove) */}
        {showMenu && (
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/40 hover:bg-black/60 rounded-full"
              title="More"
              onClick={() => setMenuOpen(v => !v)}
            >
              <MoreVertical size={16} />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-surface rounded-xl border border-white/10 shadow-xl overflow-hidden">
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2 text-red-300"
                  onClick={() => {
                    setMenuOpen(false);
                    onRemove?.();
                  }}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0">
        <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{title}</h4>
        <p className="text-xs text-textSub truncate">{author || ''}</p>
      </div>
    </div>
  );
};

