import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Home, Search, Library, PlusSquare, Upload, Music,
  Maximize2, Play, ListMusic, FolderInput, MoreVertical,
  Volume2, ArrowUpDown, Headphones
} from 'lucide-react';
import { Track, PlayerState, Playlist, ShuffleMode, RepeatMode, Audiobook } from './types';
import { APP_NAME, DEFAULT_PLAYLISTS, SAMPLE_COVER_ARTS, formatTime } from './constants';
import { Button } from './components/Button';
import { PlaylistActions } from './components/PlaylistActions';
import { PlayerControls } from './components/PlayerControls';
import { FullPlayer } from './components/FullPlayer';
import { QueueDrawer } from './components/QueueDrawer';
import { AudiobookLibrary } from './components/AudiobookLibrary';
import { AudiobookPlayer } from './components/AudiobookPlayer';
import { AudiobookMiniPlayer } from './components/AudiobookMiniPlayer';
import { AppShell } from './components/AppShell';
import { BottomTabs, type MobileTab } from './components/BottomTabs';
import { TopHeader } from './components/TopHeader';
import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';
import { LibraryView } from './views/LibraryView';
import { getTrackKey, persistDirHandle, loadSavedDirectories, readAllAudioFromHandle, readPlayCount, writePlayCount, pickDirectory, saveSource, getSource, removeSource, getAllSources } from './services/library';
import { getPlaybackPosition, savePlaybackPosition, saveAudiobookMetadata, saveLastPlayedBook, getLastPlayedBook } from './services/audiobookService';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${active ? 'text-textMain bg-surfaceHighlight' : 'text-textSub hover:text-textMain hover:bg-white/5'}`}
  >
    <Icon size={24} />
    <span className="font-semibold text-sm truncate">{label}</span>
  </div>
);

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
  playlists: Playlist[];
  onAddToQueue: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onRemoveFromPlaylist?: () => void;
}

const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isCurrent,
  onPlay,
  playlists,
  onAddToQueue,
  onAddToPlaylist,
  onRemoveFromPlaylist
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu on outside click or ESC
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowPlaylists(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setShowPlaylists(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      onClick={onPlay}
      className={`group flex items-center gap-4 p-2 rounded-md hover:bg-white/10 cursor-pointer ${isCurrent ? 'text-secondary' : 'text-textSub'}`}
    >
      <span className="w-6 text-center text-sm">{isCurrent ? <Music size={16} className="animate-pulse" /> : index + 1}</span>
      <div className="w-10 h-10 rounded-sm overflow-hidden bg-surfaceHighlight flex-shrink-0">
        {track.coverArt ? (
          <img src={track.coverArt} alt={track.title} className="w-10 h-10 object-cover" />
        ) : (
          <div className="w-10 h-10 flex items-center justify-center">
            <Music size={16} className="opacity-40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${isCurrent ? 'text-secondary' : 'text-textMain'}`}>{track.title}</div>
        <div className="text-xs truncate group-hover:text-white">{track.artist}</div>
      </div>
      <div className="hidden sm:block text-xs text-textSub w-24 text-right">Plays: {track.playCount}</div>
      <div className="text-xs font-mono">{track.duration ? formatTime(track.duration) : '--:--'}</div>
      <div className="relative" onClick={(e) => e.stopPropagation()} ref={menuRef}>
        <Button variant="ghost" size="icon" onClick={() => setMenuOpen(o => !o)} title="More options">
          <MoreVertical size={18} />
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 w-48 bg-surface rounded-md border border-white/10 shadow-xl overflow-hidden">
            <div
              className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer"
              onClick={() => {
                onAddToQueue();
                setMenuOpen(false);
              }}
            >
              Add to queue
            </div>
            <div
              className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer"
              onClick={() => setShowPlaylists(p => !p)}
            >
              Add to playlist
            </div>
            {showPlaylists && (
              <div className="max-h-56 overflow-auto border-t border-white/5">
                {playlists.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-textSub">No playlists yet</div>
                ) : (
                  playlists.map(pl => (
                    <div
                      key={pl.id}
                      className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer"
                      onClick={() => {
                        onAddToPlaylist(pl.id);
                        setMenuOpen(false);
                        setShowPlaylists(false);
                      }}
                    >
                      {pl.name}
                    </div>
                  ))
                )}
              </div>
            )}
            {onRemoveFromPlaylist && (
              <div
                className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer border-t border-white/5 text-red-300"
                onClick={() => {
                  onRemoveFromPlaylist();
                  setMenuOpen(false);
                }}
              >
                Remove from playlist
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // --- STATE ---
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>(DEFAULT_PLAYLISTS);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'audiobooks'>('home');
  const [activeBook, setActiveBook] = useState<Audiobook | null>(null);
  const [isAudiobookExpanded, setIsAudiobookExpanded] = useState(false);
  const [audiobookIsPlaying, setAudiobookIsPlaying] = useState(false);
  const [audiobookProgress, setAudiobookProgress] = useState(0);
  const [audiobookSpeed, setAudiobookSpeed] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistSort, setPlaylistSort] = useState<Record<string, 'recent' | 'title' | 'artist' | 'album'>>({});
  const [playlistSortDir, setPlaylistSortDir] = useState<Record<string, 'asc' | 'desc'>>({});

  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrackId: null,
    isPlaying: false,
    volume: 0.25,
    progress: 0,
    queue: [],
    originalQueue: [],
    shuffleMode: ShuffleMode.OFF,
    repeatMode: RepeatMode.OFF,
    history: [],
    isExpanded: false,
    upNext: [],
    isQueueOpen: false,
    baseQueueIndex: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audiobookAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastAudiobookPersistRef = useRef<number>(0);
  const activeBookRef = useRef<Audiobook | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const playerStateRef = useRef(playerState);
  const tracksRef = useRef(tracks);

  useEffect(() => {
    playerStateRef.current = playerState;
    tracksRef.current = tracks;
  }, [playerState, tracks]);

  // --- AUDIO LOGIC ---

  const handleTrackEnd = useCallback(() => {
    const state = playerStateRef.current;

    // Always prioritize Up Next, even when repeat-one is enabled.
    if (state.upNext && state.upNext.length > 0) {
      const [nextId, ...rest] = state.upNext;
      setPlayerState(prev => ({ ...prev, upNext: rest }));
      playTrackInternal(nextId);
      return;
    }

    if (state.repeatMode === RepeatMode.ONE) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      const { queue, repeatMode } = state;
      if (queue.length === 0) return;

      let nextIndex = state.baseQueueIndex + 1;

      if (nextIndex >= queue.length) {
        if (repeatMode === RepeatMode.ALL) {
          nextIndex = 0;
          setPlayerState(prev => ({ ...prev, baseQueueIndex: nextIndex }));
          playTrackInternal(queue[nextIndex]);
        } else {
          setPlayerState(prev => ({ ...prev, isPlaying: false }));
        }
      } else {
        setPlayerState(prev => ({ ...prev, baseQueueIndex: nextIndex }));
        playTrackInternal(queue[nextIndex]);
      }
    }
  }, []);

  const playTrackInternal = (trackId: string) => {
    const track = tracksRef.current.find(t => t.id === trackId);
    if (!track || !audioRef.current) return;

    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, playCount: t.playCount + 1 } : t
    ));
    // Persist play count (fire-and-forget)
    try {
      const key = track.file ? getTrackKey(track.file) : null;
      if (key) {
        const newCount = (track.playCount || 0) + 1;
        writePlayCount(key, newCount).catch(() => { });
      }
    } catch { }

    audioRef.current.src = track.url;
    audioRef.current.play().catch(e => console.error("Playback error:", e));

    setPlayerState(prev => ({
      ...prev,
      currentTrackId: trackId,
      isPlaying: true,
      history: [...prev.history, trackId]
    }));
  };

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();

      audioRef.current.addEventListener('timeupdate', () => {
        setPlayerState(prev => ({ ...prev, progress: audioRef.current?.currentTime || 0 }));
      });

      audioRef.current.addEventListener('ended', () => {
        handleTrackEnd();
      });

      audioRef.current.addEventListener('loadedmetadata', () => {
        const duration = audioRef.current?.duration;
        const currentId = playerStateRef.current.currentTrackId;

        if (duration && currentId && duration !== Infinity) {
          setTracks(prev => prev.map(t =>
            t.id === currentId ? { ...t, duration } : t
          ));
        }
      });

      // Ensure initial volume matches state when the Audio element is created.
      audioRef.current.volume = playerStateRef.current.volume;
    }
    return () => { };
  }, [handleTrackEnd]);

  useEffect(() => {
    if (audioRef.current) {
      if (playerState.isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(() => { });
      } else if (!playerState.isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [playerState.isPlaying]);

  // --- HISTORY / BACK BUTTON ---
  const isPopping = useRef(false);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      isPopping.current = true;
      const state = e.state || {};
      setActiveTab(state.tab || 'home');
      setSelectedPlaylistId(state.playlistId || null);
    };

    window.addEventListener('popstate', handlePopState);

    // Initialize history state on mount to match current UI (replace, don't push)
    window.history.replaceState(
      { tab: activeTab, playlistId: selectedPlaylistId },
      '',
      ''
    );

    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Run once on mount

  useEffect(() => {
    if (isPopping.current) {
      isPopping.current = false;
      return;
    }
    window.history.pushState(
      { tab: activeTab, playlistId: selectedPlaylistId },
      '',
      ''
    );
  }, [activeTab, selectedPlaylistId]);

  // Keep audio element's volume in sync with state volume.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, playerState.volume));
    }
  }, [playerState.volume]);

  // --- REHYDRATE LIBRARY ON START ---
  useEffect(() => {
    // Only rehydrate if we don't already have tracks loaded
    if (tracksRef.current.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        // Prefer sources (playlist->handle) to rebuild playlists and tracks
        const sourcesMap = await getAllSources();
        const sourceEntries = Object.entries(sourcesMap);
        let builtTracks: Track[] = [];
        let playlistUpdates: { id: string; name: string; trackIds: string[] }[] = [];

        if (sourceEntries.length > 0) {
          const jsmediatags = (window as any).jsmediatags;
          for (const [playlistId, src] of sourceEntries) {
            if (!src?.handle) continue;
            const files = await readAllAudioFromHandle(src.handle);
            const built = await Promise.all(files.map(async (file, i) => {
              const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              let artist = "Unknown Artist";
              let title = baseName;
              let album = "Local Import";
              let coverArt = SAMPLE_COVER_ARTS[i % SAMPLE_COVER_ARTS.length];
              if (jsmediatags) {
                try {
                  const tags: any = await new Promise((resolve) => {
                    jsmediatags.read(file, {
                      onSuccess: (tag: any) => resolve(tag.tags),
                      onError: () => resolve({}),
                    });
                  });
                  if (tags) {
                    if (tags.title) title = tags.title;
                    if (tags.artist) artist = tags.artist;
                    if (tags.album) album = tags.album;
                    if (tags.picture) {
                      const { data, format } = tags.picture;
                      let base64String = "";
                      for (let j = 0; j < data.length; j++) {
                        base64String += String.fromCharCode(data[j]);
                      }
                      coverArt = `data:${format};base64,${window.btoa(base64String)}`;
                    }
                  }
                } catch { }
              }
              const playCount = await readPlayCount(getTrackKey(file)).catch(() => 0) || 0;
              return {
                id: `rehydrated-${playlistId}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                file, title, artist, album, duration: 0,
                url: URL.createObjectURL(file),
                playCount, coverArt,
              } as Track;
            }));
            // Merge built into global list with dedupe by file key
            const keyOf = (t: Track) => getTrackKey(t.file);
            const existingKeys = new Map(builtTracks.map(t => [keyOf(t), t.id]));
            const newIds: string[] = [];
            for (const t of built) {
              const k = keyOf(t);
              const existingId = existingKeys.get(k);
              if (existingId) {
                newIds.push(existingId);
              } else {
                builtTracks.push(t);
                existingKeys.set(k, t.id);
                newIds.push(t.id);
              }
            }
            playlistUpdates.push({ id: playlistId, name: src.name || 'Playlist', trackIds: newIds });
          }
          if (cancelled) return;
          if (builtTracks.length > 0) {
            setTracks(builtTracks);
            setPlaylists(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const merged = [...prev];
              for (const u of playlistUpdates) {
                const idx = merged.findIndex(p => p.id === u.id);
                if (idx >= 0) merged[idx] = { ...merged[idx], name: u.name, trackIds: u.trackIds };
                else merged.push({ id: u.id, name: u.name, trackIds: u.trackIds });
              }
              return merged;
            });
            setPlayerState(prev => {
              if (prev.queue.length === 0) {
                const ids = builtTracks.map(t => t.id);
                return { ...prev, queue: ids, originalQueue: ids, baseQueueIndex: 0 };
              }
              return prev;
            });
            return;
          }
        }

        // Fallback legacy: loadSavedDirectories
        const saved = await loadSavedDirectories();
        if (!saved || saved.length === 0) return;
        const collectedFiles: File[] = [];
        for (const { handle } of saved) {
          const files = await readAllAudioFromHandle(handle);
          collectedFiles.push(...files);
        }
        if (cancelled || collectedFiles.length === 0) return;

        // Build tracks similar to processFiles
        const jsmediatags = (window as any).jsmediatags;
        const built = await Promise.all(collectedFiles.map(async (file, i) => {
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          let artist = "Unknown Artist";
          let title = baseName;
          let album = "Local Import";
          let coverArt = SAMPLE_COVER_ARTS[i % SAMPLE_COVER_ARTS.length];
          if (jsmediatags) {
            try {
              const tags: any = await new Promise((resolve) => {
                jsmediatags.read(file, {
                  onSuccess: (tag: any) => resolve(tag.tags),
                  onError: () => resolve({}),
                });
              });
              if (tags) {
                if (tags.title) title = tags.title;
                if (tags.artist) artist = tags.artist;
                if (tags.album) album = tags.album;
                if (tags.picture) {
                  const { data, format } = tags.picture;
                  let base64String = "";
                  for (let j = 0; j < data.length; j++) {
                    base64String += String.fromCharCode(data[j]);
                  }
                  coverArt = `data:${format};base64,${window.btoa(base64String)}`;
                }
              }
            } catch { }
          }
          const playCount = await readPlayCount(getTrackKey(file)).catch(() => 0) || 0;
          return {
            id: `rehydrated-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            title,
            artist,
            album,
            duration: 0,
            url: URL.createObjectURL(file),
            playCount,
            coverArt,
          } as Track;
        }));

        if (cancelled) return;
        setTracks(built);
        setPlayerState(prev => {
          if (prev.queue.length === 0) {
            const ids = built.map(t => t.id);
            return { ...prev, queue: ids, originalQueue: ids, baseQueueIndex: 0 };
          }
          return prev;
        });
      } catch {
        // no-op if permissions not available
      }
    })();
    return () => { cancelled = true; };
  }, []);


  // --- CONTROLS ---

  const playTrack = useCallback((trackId: string) => {
    playTrackInternal(trackId);
  }, []);

  const togglePlay = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const nextTrack = () => {
    const { queue, currentTrackId, repeatMode, upNext, baseQueueIndex } = playerState;
    // Up Next has priority
    if (upNext.length > 0) {
      const [nextId, ...rest] = upNext;
      setPlayerState(prev => ({ ...prev, upNext: rest }));
      playTrack(nextId);
      return;
    }
    if (queue.length === 0) return;

    let nextIndex = baseQueueIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeatMode === RepeatMode.ALL) {
        nextIndex = 0;
      } else {
        setPlayerState(prev => ({ ...prev, isPlaying: false }));
        return;
      }
    }
    setPlayerState(prev => ({ ...prev, baseQueueIndex: nextIndex }));
    playTrack(queue[nextIndex]);
  };

  const prevTrack = () => {
    const { queue, currentTrackId, baseQueueIndex } = playerState;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex = baseQueueIndex - 1;
    if (prevIndex >= 0) {
      setPlayerState(prev => ({ ...prev, baseQueueIndex: prevIndex }));
      playTrack(queue[prevIndex]);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlayerState(prev => ({ ...prev, progress: time }));
    }
  };

  // Volume control: 0.0 - 1.0
  const setVolume = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setPlayerState(prev => ({ ...prev, volume: clamped }));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  };

  // Build a randomized queue for a given context with the selected track first.
  const buildRandomizedQueue = (allIds: string[], currentId: string): string[] => {
    const others = allIds.filter(id => id !== currentId);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    return [currentId, ...others];
  };

  // Play a track and replace the base queue with a randomized version of the context.
  const playInContext = (trackId: string, contextIds: string[]) => {
    const randomized = buildRandomizedQueue(contextIds, trackId);
    setPlayerState(prev => ({
      ...prev,
      queue: randomized,
      originalQueue: randomized,
      // If the clicked track was in Up Next, remove it to avoid duplication
      upNext: prev.upNext.filter(id => id !== trackId),
      // We explicitly set the order, keep shuffle off for determinism
      shuffleMode: ShuffleMode.OFF,
      baseQueueIndex: 0,
    }));
    playTrackInternal(trackId);
  };

  // --- QUEUE / UP-NEXT HELPERS ---
  const addTrackToQueue = (trackId: string) => {
    // Add to Up Next so it plays next; preserve FIFO and avoid duplicates.
    setPlayerState(prev => {
      if (prev.upNext.includes(trackId)) return prev;
      return { ...prev, upNext: [...prev.upNext, trackId] };
    });
  };

  const clearUpNext = () => {
    setPlayerState(prev => ({ ...prev, upNext: [] }));
  };

  const getUpcomingAfterCurrent = (): Track[] => {
    const { queue, baseQueueIndex } = playerState;
    if (queue.length === 0) return [];
    const idx = Math.max(0, baseQueueIndex);
    const after = queue.slice(idx + 1);
    // Do NOT filter out Up Next tracks here. We want "Next from" to remain
    // a stable view of the base queue even when items are enqueued to play next.
    const orderedIds = after;
    const idToTrack = new Map(tracks.map(t => [t.id, t]));
    return orderedIds
      .map(id => idToTrack.get(id))
      .filter(Boolean) as Track[];
  };

  const playFromQueue = (trackId: string) => {
    // If the selected track exists in upNext, remove it before playing.
    setPlayerState(prev => {
      const indexInQueue = prev.queue.indexOf(trackId);
      const nextState = {
        ...prev,
        upNext: prev.upNext.filter(id => id !== trackId),
        baseQueueIndex: indexInQueue >= 0 ? indexInQueue : prev.baseQueueIndex
      };
      return nextState;
    });
    playTrackInternal(trackId);
  };

  const toggleShuffle = () => {
    setPlayerState(prev => {
      const nextMode =
        prev.shuffleMode === ShuffleMode.OFF ? ShuffleMode.TRUE :
          prev.shuffleMode === ShuffleMode.TRUE ? ShuffleMode.SMART :
            ShuffleMode.OFF;

      let newQueue = [...prev.originalQueue];

      if (nextMode === ShuffleMode.TRUE) {
        for (let i = newQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newQueue[i], newQueue[j]] = [newQueue[j], newQueue[i]];
        }
      } else if (nextMode === ShuffleMode.SMART) {
        const weightedTracks = newQueue.map(id => {
          const t = tracks.find(tr => tr.id === id);
          const weight = t ? 1 / (t.playCount + 1) : 1;
          return { id, weight, rand: Math.random() * weight };
        });
        weightedTracks.sort((a, b) => b.rand - a.rand);
        newQueue = weightedTracks.map(w => w.id);
      }

      if (prev.currentTrackId) {
        newQueue = newQueue.filter(id => id !== prev.currentTrackId);
        newQueue.unshift(prev.currentTrackId);
      }

      return {
        ...prev,
        shuffleMode: nextMode,
        queue: nextMode === ShuffleMode.OFF ? prev.originalQueue : newQueue,
        baseQueueIndex: 0
      };
    });
  };

  // --- PLAYLISTS ---
  // Simple create flow:
  // - Prompt the user for a playlist name
  // - Ignore empty/cancel responses
  // - Append a new Playlist to state with a unique id
  const handleCreatePlaylist = () => {
    const input = window.prompt('New playlist name');
    if (!input) return; // user cancelled
    const name = input.trim();
    if (!name) return; // empty/whitespace only

    // Use a readable slug as base id and ensure uniqueness with a timestamp suffix.
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'playlist';
    const id = `${base}-${Date.now()}`;

    setPlaylists(prev => [...prev, { id, name, trackIds: [] }]);
  };

  // Filter utility to get tracks for a specific playlist.
  // Supports the synthetic 'all' playlist id.
  const getTracksForPlaylist = (playlistId: string): Track[] => {
    if (playlistId === 'all') return tracks;
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return [];
    if (!pl.trackIds || pl.trackIds.length === 0) return [];
    const idSet = new Set(pl.trackIds);
    return tracks.filter(t => idSet.has(t.id));
  };

  // Return playlist tracks sorted based on selected sort option for that playlist.
  const getSortedTracksForPlaylist = (playlistId: string): Track[] => {
    const base = getTracksForPlaylist(playlistId);
    const option = playlistSort[playlistId] || 'recent';
    const dir = playlistSortDir[playlistId] || 'asc';
    if (option === 'recent') {
      return dir === 'desc' ? [...base].reverse() : base;
    }
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    const safe = (v?: string) => (v || '').toString();
    const sorted = [...base];
    if (option === 'title') {
      sorted.sort((a, b) => collator.compare(safe(a.title), safe(b.title)));
    } else if (option === 'artist') {
      sorted.sort((a, b) => collator.compare(safe(a.artist), safe(b.artist)));
    } else if (option === 'album') {
      sorted.sort((a, b) => collator.compare(safe(a.album), safe(b.album)));
    }
    return dir === 'desc' ? sorted.reverse() : sorted;
  };

  // Add helpers to manage playlist membership from row menus.

  const addTrackToPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId
        ? { ...p, trackIds: Array.from(new Set([...(p.trackIds || []), trackId])) }
        : p
    ));
  };

  const removeTrackFromPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId
        ? { ...p, trackIds: (p.trackIds || []).filter(id => id !== trackId) }
        : p
    ));
  };

  // --- FILE HANDLING ---

  // Process uploaded files. When invoked from a folder upload, we try to create a
  // playlist using the folder name (derived from webkitRelativePath). If we cannot
  // infer the folder name (browser limitation when files are at the folder root),
  // we prompt the user for a playlist name as a fallback.
  const processFiles = async (fileList: FileList, options?: { isFolderUpload?: boolean }) => {
    setIsProcessing(true);
    const files = Array.from(fileList);
    const audioFiles = files.filter(f => f.type.startsWith('audio/'));
    const lyricFiles = files.filter(f => f.name.endsWith('.lrc') || f.name.endsWith('.txt'));

    // Try to infer the folder name for a future playlist (only for folder uploads).
    // We inspect the first path segment of webkitRelativePath across files.
    const firstSegments = new Set<string>();
    if (options?.isFolderUpload) {
      for (const f of audioFiles) {
        const rel = (f as any).webkitRelativePath as string | undefined;
        if (rel && rel.includes('/')) {
          const seg = rel.split('/')[0];
          if (seg) firstSegments.add(seg);
        }
      }
    }

    // Create map for lyrics: filename (no extension) -> file content
    const lyricsMap = new Map<string, string>();
    for (const lFile of lyricFiles) {
      try {
        const text = await lFile.text();
        const baseName = lFile.name.substring(0, lFile.name.lastIndexOf('.'));
        lyricsMap.set(baseName, text);
      } catch (err) {
        console.warn("Failed to read lyric file", lFile.name);
      }
    }

    const newTracks = await Promise.all(audioFiles.map(async (file, i) => {
      const path = file.webkitRelativePath || file.name;
      const pathParts = path.split('/');
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'));

      // Default Parsing (Fallback)
      let artist = "Unknown Artist";
      let title = baseName;
      let album = "Local Import";

      // Try to guess from folder structure if simple filename fails
      if (pathParts.length >= 3) {
        // e.g. Artist/Album/Song.mp3
        artist = pathParts[pathParts.length - 3];
      } else {
        // Try splitting filename e.g. "Artist - Title"
        const nameParts = title.split('-');
        if (nameParts.length > 1) {
          artist = nameParts[0].trim();
          title = nameParts[1].trim();
        }
      }

      let coverArt = SAMPLE_COVER_ARTS[i % SAMPLE_COVER_ARTS.length]; // Fallback

      // Extract Metadata using jsmediatags from window
      const jsmediatags = (window as any).jsmediatags;

      if (jsmediatags) {
        try {
          const tags: any = await new Promise((resolve) => {
            jsmediatags.read(file, {
              onSuccess: (tag: any) => resolve(tag.tags),
              onError: (error: any) => {
                // console.warn(`Error reading tags for ${file.name}:`, error);
                resolve({});
              }
            });
          });

          if (tags) {
            if (tags.title) title = tags.title;
            if (tags.artist) artist = tags.artist;
            if (tags.album) album = tags.album;
            if (tags.picture) {
              const { data, format } = tags.picture;
              let base64String = "";
              // Converting bytes to base64
              for (let j = 0; j < data.length; j++) {
                base64String += String.fromCharCode(data[j]);
              }
              coverArt = `data:${format};base64,${window.btoa(base64String)}`;
            }
          }
        } catch (e) {
          console.warn("Metadata read failed for", file.name, e);
        }
      }

      const lyrics = lyricsMap.get(baseName);

      return {
        id: `local-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        title,
        artist,
        album: album || (pathParts.length >= 2 ? pathParts[pathParts.length - 2] : 'Local Import'),
        duration: 0,
        url: URL.createObjectURL(file),
        playCount: 0,
        coverArt,
        lyrics
      };
    }));

    setTracks(prev => {
      const updated = [...prev, ...newTracks];
      if (playerState.queue.length === 0) {
        const ids = updated.map(t => t.id);
        setPlayerState(s => ({ ...s, queue: ids, originalQueue: ids, baseQueueIndex: 0 }));
      }
      return updated;
    });

    // Auto-create a playlist named after the folder (for folder uploads).
    if (options?.isFolderUpload) {
      // Determine name:
      // - If exactly one first-level subfolder is found, use it as the playlist name.
      // - If none or multiple are found, we likely selected a root folder with files or a parent with many albums.
      //   Fallback to a prompt so the user can confirm/name the playlist.
      let playlistName: string | null = null;
      if (firstSegments.size === 1) {
        playlistName = Array.from(firstSegments)[0];
      } else {
        const defaultName = firstSegments.size > 1
          ? `Imported (${Array.from(firstSegments).slice(0, 2).join(', ')}${firstSegments.size > 2 ? ', …' : ''})`
          : 'Imported Folder';
        const input = window.prompt('Name for new playlist', defaultName);
        if (input && input.trim()) {
          playlistName = input.trim();
        }
      }

      if (playlistName) {
        // Create a readable slug id similar to manual playlist creation.
        const base = playlistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'playlist';
        const id = `${base}-${Date.now()}`;
        setPlaylists(prev => [...prev, { id, name: playlistName as string, trackIds: newTracks.map(t => t.id) }]);
      }
    }

    setIsProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files, { isFolderUpload: false });
    }
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files, { isFolderUpload: true });
      // Try to persist a directory handle (if supported) so we can rehydrate later
      (async () => {
        try {
          const anyWin = window as any;
          if (anyWin?.showDirectoryPicker) {
            const handle = await anyWin.showDirectoryPicker();
            await persistDirHandle(`dir-${Date.now()}`, handle);
          }
        } catch {
          // ignore if user cancels or API unsupported
        }
      })();
    }
  };

  const currentTrack = tracks.find(t => t.id === playerState.currentTrackId);

  /**
   * Shared screen renderer:
   * - We use the same screen content on mobile and desktop for now.
   * - In the next steps, we will replace the mobile variants with dedicated
   *   Spotify-style views (Home/Search/Library) and keep desktop stable.
   */
  const renderViews = () => (
    <>
      {activeTab === 'home' && (
        <>
          {selectedPlaylistId ? (
            // Playlist Detail View
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">
                  {selectedPlaylistId === 'all'
                    ? 'All Songs'
                    : (playlists.find(p => p.id === selectedPlaylistId)?.name || 'Playlist')}
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    className="bg-surface text-sm text-textMain border border-divider rounded-md px-2 py-1"
                    value={playlistSort[selectedPlaylistId] || 'recent'}
                    onChange={(e) => {
                      const val = e.target.value as 'recent' | 'title' | 'artist' | 'album';
                      setPlaylistSort(prev => ({ ...prev, [selectedPlaylistId]: val }));
                    }}
                    title="Sort"
                  >
                    <option value="recent">Recently Added</option>
                    <option value="title">Name</option>
                    <option value="artist">Artist</option>
                    <option value="album">Album</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const current = playlistSortDir[selectedPlaylistId] || 'asc';
                      const next = current === 'asc' ? 'desc' : 'asc';
                      setPlaylistSortDir(prev => ({ ...prev, [selectedPlaylistId]: next }));
                    }}
                    title={`Reverse order (${(playlistSortDir[selectedPlaylistId] || 'asc') === 'asc' ? 'A→Z/Old→New' : 'Z→A/New→Old'})`}
                  >
                    <ArrowUpDown size={18} />
                  </Button>
                  <Button variant="secondary" onClick={() => setSelectedPlaylistId(null)}>Back</Button>
                </div>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                {getSortedTracksForPlaylist(selectedPlaylistId).length === 0 ? (
                  <div className="text-center py-10 text-textSub">
                    No tracks in this playlist.
                  </div>
                ) : (
                  getSortedTracksForPlaylist(selectedPlaylistId).map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      isCurrent={track.id === playerState.currentTrackId}
                      onPlay={() => {
                        const ids = getTracksForPlaylist(selectedPlaylistId).map(t => t.id);
                        playInContext(track.id, ids);
                      }}
                      playlists={playlists}
                      onAddToQueue={() => addTrackToQueue(track.id)}
                      onAddToPlaylist={(plId) => addTrackToPlaylist(track.id, plId)}
                      onRemoveFromPlaylist={
                        selectedPlaylistId && selectedPlaylistId !== 'all'
                          ? () => removeTrackFromPlaylist(track.id, selectedPlaylistId)
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            // Default Home View
            <div className="space-y-8">
              <h2 className="text-3xl font-bold">Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}</h2>

              {/* Featured Playlists Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {playlists.concat([{ id: 'all', name: 'All Songs', trackIds: [] } as Playlist]).map((pl) => (
                  <div
                    key={pl.id}
                    className="group bg-surface/80 hover:bg-surfaceHighlight transition-colors rounded-md overflow-hidden flex items-center gap-4 pr-4 cursor-pointer"
                    onClick={() => setSelectedPlaylistId(pl.id)}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex-shrink-0 flex items-center justify-center">
                      <ListMusic className="text-white/50" />
                    </div>
                    <span className="font-bold text-sm truncate">{pl.name}</span>
                    <div className="ml-auto bg-accent rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                      <Play size={16} fill="black" className="text-black ml-1" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tracks List */}
              <div>
                <h3 className="text-xl font-bold mb-4">Recently Added</h3>
                {tracks.length === 0 ? (
                  <div className="text-center py-10 text-textSub border border-dashed border-divider rounded-lg">
                    <p className="mb-4">No music found.</p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>Upload Files</Button>
                      <Button variant="secondary" onClick={() => folderInputRef.current?.click()} disabled={isProcessing}>Upload Folder</Button>
                    </div>
                    {isProcessing && <p className="mt-4 text-secondary animate-pulse">Reading metadata...</p>}
                  </div>
                ) : (
                  <div className="bg-black/20 rounded-lg p-2">
                    {tracks.map((track, i) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={i}
                        isCurrent={track.id === playerState.currentTrackId}
                        onPlay={() => {
                          const ids = tracks.map(t => t.id);
                          playInContext(track.id, ids);
                        }}
                        playlists={playlists}
                        onAddToQueue={() => addTrackToQueue(track.id)}
                        onAddToPlaylist={(plId) => addTrackToPlaylist(track.id, plId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'library' && (
        <div>
          <h2 className="text-3xl font-bold mb-6">Your Library</h2>
          <div className="bg-black/20 rounded-lg p-2">
            {tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isCurrent={track.id === playerState.currentTrackId}
                onPlay={() => {
                  const ids = tracks.map(t => t.id);
                  playInContext(track.id, ids);
                }}
                playlists={playlists}
                onAddToQueue={() => addTrackToQueue(track.id)}
                onAddToPlaylist={(plId) => addTrackToPlaylist(track.id, plId)}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="flex flex-col items-center justify-center h-full text-textSub">
          <Search size={48} className="mb-4 opacity-50" />
          <p>Search your local files...</p>
        </div>
      )}

      {activeTab === 'audiobooks' && (
        <AudiobookLibrary onSelectBook={(book) => {
          // Pause music player if it's playing
          setPlayerState(prev => ({ ...prev, isPlaying: false }));
          setActiveBook(book);
          setIsAudiobookExpanded(true);
          // Save as last played book for auto-reload
          saveLastPlayedBook(book.id).catch(() => { });
        }} />
      )}
    </>
  );

  // --- AUDIOBOOK AUDIO LIFECYCLE ---
  // Keep a ref so event handlers don't capture stale activeBook.
  useEffect(() => {
    activeBookRef.current = activeBook;
  }, [activeBook]);

  useEffect(() => {
    if (!audiobookAudioRef.current) {
      audiobookAudioRef.current = new Audio();

      audiobookAudioRef.current.addEventListener('timeupdate', () => {
        const a = audiobookAudioRef.current;
        if (!a) return;
        const t = a.currentTime || 0;
        setAudiobookProgress(t);

        // Persist every ~5 seconds (cheap + resilient).
        const now = Date.now();
        if (activeBook && now - lastAudiobookPersistRef.current > 5000) {
          lastAudiobookPersistRef.current = now;
          savePlaybackPosition(activeBook.id, t).catch(() => { });
        }
      });

      audiobookAudioRef.current.addEventListener('play', () => setAudiobookIsPlaying(true));
      audiobookAudioRef.current.addEventListener('pause', () => setAudiobookIsPlaying(false));
      audiobookAudioRef.current.addEventListener('ended', () => setAudiobookIsPlaying(false));

      audiobookAudioRef.current.addEventListener('loadedmetadata', () => {
        const a = audiobookAudioRef.current;
        const book = activeBookRef.current;
        if (!a || !book) return;
        if (a.duration && a.duration !== Infinity) {
          const updated = { ...book, duration: a.duration };
          setActiveBook(updated);
          saveAudiobookMetadata(updated).catch(() => { });
        }
      });
    }
  }, [activeBook]);

  // When activeBook changes, load saved position, set src, and start playing.
  useEffect(() => {
    const a = audiobookAudioRef.current;
    if (!a) return;
    if (!activeBook) return;

    let cancelled = false;
    (async () => {
      try {
        // Some browsers won't populate duration for blob URLs unless we call load().
        // We want duration even when NOT autoplaying.
        a.preload = 'metadata';
        a.src = activeBook.url;
        a.playbackRate = audiobookSpeed;
        a.load();

        const savedPos = await getPlaybackPosition(activeBook.id).catch(() => 0);
        if (cancelled) return;

        // Wait for metadata so seeking doesn't behave oddly.
        await new Promise<void>((resolve) => {
          const onMeta = () => resolve();
          const onErr = () => resolve();
          a.addEventListener('loadedmetadata', onMeta, { once: true });
          a.addEventListener('error', onErr, { once: true });
          // If metadata is already available, resolve immediately.
          if (Number.isFinite(a.duration) && a.duration > 0) resolve();
        });

        if (cancelled) return;
        // Clamp saved position once duration is known.
        const dur = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : Infinity;
        const next = Math.max(0, Math.min(savedPos || 0, dur));
        a.currentTime = next;
        setAudiobookProgress(next);

        // Do NOT autoplay when a book is selected.
        a.pause();
        setAudiobookIsPlaying(false);
      } catch { }
    })();

    return () => { cancelled = true; };
  }, [activeBook?.id, activeBook?.url]);

  // Keep playbackRate synced
  useEffect(() => {
    const a = audiobookAudioRef.current;
    if (!a) return;
    a.playbackRate = audiobookSpeed;
  }, [audiobookSpeed]);

  const audiobookTogglePlay = () => {
    const a = audiobookAudioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => { });
    else a.pause();
  };

  const audiobookSeek = (time: number) => {
    const a = audiobookAudioRef.current;
    if (!a || !activeBook) return;
    const dur = Number.isFinite(a.duration) ? a.duration : (activeBook.duration || Infinity);
    const next = Math.max(0, Math.min(time, dur));
    a.currentTime = next;
    setAudiobookProgress(next);
    savePlaybackPosition(activeBook.id, next).catch(() => { });
  };

  const audiobookJump = (deltaSeconds: number) => {
    const a = audiobookAudioRef.current;
    if (!a) return;
    audiobookSeek((a.currentTime || 0) + deltaSeconds);
  };

  const audiobookStop = () => {
    const a = audiobookAudioRef.current;
    if (a) {
      a.pause();
      a.src = '';
    }
    setAudiobookIsPlaying(false);
    setAudiobookProgress(0);
    setIsAudiobookExpanded(false);
    setActiveBook(null);
  };

  return (
    <div className={`flex flex-col h-screen bg-black text-textMain font-sans ${playerState.isQueueOpen ? 'md:pr-[360px]' : ''}`}>

      {/* --- MOBILE SHELL (Spotify-style structure) --- */}
      <AppShell
        header={
          <TopHeader
            title={
              activeTab === 'home'
                ? `Good ${new Date().getHours() < 12 ? 'Morning' : 'Evening'}`
                : activeTab === 'search'
                  ? 'Search'
                  : activeTab === 'audiobooks'
                    ? 'Audiobooks'
                    : 'Your Library'
            }
            right={
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-surfaceElevated hover:bg-surfaceHighlight transition-colors flex items-center justify-center"
                onClick={() => folderInputRef.current?.click()}
                title="Import folder"
              >
                <FolderInput size={18} />
              </button>
            }
          />
        }
        hasMiniPlayer={
          (!!currentTrack && !playerState.isExpanded && !activeBook) ||
          (!!activeBook && !isAudiobookExpanded)
        }
        bottom={
          <div>
            {/* Mini player area (sits above bottom tabs) */}
            {activeBook && !isAudiobookExpanded ? (
              <div className="px-2 pb-2">
                {/* Wrap the mini player so it feels like Spotify’s “card above tabs”. */}
                <div className="rounded-card overflow-hidden border border-divider">
                  <AudiobookMiniPlayer
                    book={activeBook}
                    isPlaying={audiobookIsPlaying}
                    progress={audiobookProgress}
                    onTogglePlay={audiobookTogglePlay}
                    onJump={audiobookJump}
                    onSeek={seek}
                    onExpand={() => setIsAudiobookExpanded(true)}
                    onStop={audiobookStop}
                  />
                </div>
              </div>
            ) : null}

            {currentTrack && !playerState.isExpanded && !activeBook ? (
              <div className="px-2 pb-2">
                <button
                  type="button"
                  className={[
                    'w-full rounded-card bg-surfaceElevated border border-divider',
                    'px-3 py-2 flex items-center gap-3',
                    'hover:bg-surfaceHighlight transition-colors',
                  ].join(' ')}
                  onClick={() => setPlayerState(s => ({ ...s, isExpanded: true }))}
                  title="Open player"
                >
                  <img
                    src={currentTrack.coverArt}
                    alt=""
                    className="w-12 h-12 rounded-tile object-cover bg-surfaceHighlight flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-sm font-bold truncate">{currentTrack.title}</div>
                    <div className="text-xs text-textSub truncate">{currentTrack.artist}</div>
                  </div>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    title={playerState.isPlaying ? 'Pause' : 'Play'}
                  >
                    {playerState.isPlaying
                      ? <div className="w-3.5 h-3.5 bg-black" />
                      : <Play size={22} fill="black" className="text-black ml-0.5" />
                    }
                  </button>
                </button>
              </div>
            ) : null}

            {/* Bottom navigation */}
            <BottomTabs
              active={
                (activeTab === 'search'
                  ? 'search'
                  : (activeTab === 'library' || activeTab === 'audiobooks')
                    ? 'library'
                    : 'home') as MobileTab
              }
              onChange={(t) => {
                if (t === 'home') setSelectedPlaylistId(null);
                // We keep audiobooks as a separate internal tab,
                // but map it under "Library" for navigation simplicity.
                if (t === 'library') setActiveTab('library');
                else setActiveTab(t);
              }}
              items={[
                { key: 'home', label: 'Home', icon: Home },
                { key: 'search', label: 'Search', icon: Search },
                { key: 'library', label: 'Library', icon: Library },
              ]}
            />
          </div>
        }
      >
        {activeTab === 'home' && !selectedPlaylistId ? (
          <HomeView
            playlists={playlists}
            tracks={tracks}
            currentTrackId={playerState.currentTrackId}
            onOpenPlaylist={(id) => setSelectedPlaylistId(id)}
            onPlayInContext={(trackId, contextIds) => playInContext(trackId, contextIds)}
            onOpenAudiobooks={() => setActiveTab('audiobooks')}
          />
        ) : activeTab === 'search' ? (
          <SearchView />
        ) : activeTab === 'library' ? (
          <LibraryView
            playlists={playlists}
            tracks={tracks}
            onCreatePlaylist={handleCreatePlaylist}
            onOpenAudiobooks={() => setActiveTab('audiobooks')}
            onOpenPlaylist={(playlistId) => {
              // In Spotify, Library items open into a detail view.
              // Our closest equivalent is selecting a playlist on Home.
              setSelectedPlaylistId(playlistId);
              setActiveTab('home');
            }}
          />
        ) : (
          <div className="p-4">{renderViews()}</div>
        )}
      </AppShell>

      {/* --- MAIN LAYOUT --- */}
      <div className="hidden md:flex flex-1 overflow-hidden">

        {/* SIDEBAR (Desktop) */}
        <div className="hidden md:flex w-64 flex-col bg-background p-2 gap-2">
          <div className="p-4 flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
              <Music size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">{APP_NAME}</h1>
          </div>

          <nav className="space-y-1 bg-surface rounded-lg py-2">
            <SidebarItem
              icon={Home}
              label="Home"
              active={activeTab === 'home'}
              onClick={() => {
                setSelectedPlaylistId(null); // Clear playlist selection when going Home
                setActiveTab('home');
              }}
            />
            <SidebarItem icon={Search} label="Search" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
            <SidebarItem icon={Library} label="Your Library" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
            <SidebarItem icon={Headphones} label="Audiobooks" active={activeTab === 'audiobooks'} onClick={() => setActiveTab('audiobooks')} />
          </nav>

          <div className="flex-1 bg-surface rounded-lg p-4 overflow-y-auto mt-2">
            <div className="flex items-center justify-between mb-4 text-textSub">
              <span className="text-sm font-bold uppercase">Playlists</span>
              <div
                className="cursor-pointer hover:text-textMain"
                title="Create playlist"
                onClick={handleCreatePlaylist}
              >
                <PlusSquare size={20} />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const handle = await pickDirectory();
                  if (!handle) return;
                  const name = handle.name || 'New Playlist';
                  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
                  setPlaylists(prev => [...prev, { id, name, trackIds: [] }]);
                  await saveSource(id, name, handle);
                  // Immediately rescan to populate tracks
                  await (async () => {
                    const files = await readAllAudioFromHandle(handle);
                    const jsmediatags = (window as any).jsmediatags;
                    const built = await Promise.all(files.map(async (file, i) => {
                      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                      let artist = "Unknown Artist";
                      let title = baseName;
                      let album = "Local Import";
                      let coverArt = SAMPLE_COVER_ARTS[i % SAMPLE_COVER_ARTS.length];
                      if (jsmediatags) {
                        try {
                          const tags: any = await new Promise((resolve) => {
                            jsmediatags.read(file, {
                              onSuccess: (tag: any) => resolve(tag.tags),
                              onError: () => resolve({}),
                            });
                          });
                          if (tags) {
                            if (tags.title) title = tags.title;
                            if (tags.artist) artist = tags.artist;
                            if (tags.album) album = tags.album;
                            if (tags.picture) {
                              const { data, format } = tags.picture;
                              let base64String = "";
                              for (let j = 0; j < data.length; j++) {
                                base64String += String.fromCharCode(data[j]);
                              }
                              coverArt = `data:${format};base64,${window.btoa(base64String)}`;
                            }
                          }
                        } catch { }
                      }
                      const playCount = await readPlayCount(getTrackKey(file)).catch(() => 0) || 0;
                      return {
                        id: `src-${id}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                        file,
                        title,
                        artist,
                        album,
                        duration: 0,
                        url: URL.createObjectURL(file),
                        playCount,
                        coverArt,
                      } as Track;
                    }));
                    // Merge into global tracks while deduping by key (name|size|mtime)
                    setTracks(prev => {
                      const keyOf = (t: Track) => getTrackKey(t.file);
                      const existingKeys = new Map(prev.map(t => [keyOf(t), t.id]));
                      const toAdd: Track[] = [];
                      const newIdsForPlaylist: string[] = [];
                      for (const t of built) {
                        const k = keyOf(t);
                        const existingId = existingKeys.get(k);
                        if (existingId) {
                          newIdsForPlaylist.push(existingId);
                        } else {
                          toAdd.push(t);
                          newIdsForPlaylist.push(t.id);
                        }
                      }
                      // Update playlist trackIds
                      setPlaylists(pls => pls.map(p => p.id === id ? { ...p, trackIds: newIdsForPlaylist } : p));
                      // Initialize queue if empty
                      if (playerState.queue.length === 0) {
                        const ids = [...prev, ...toAdd].map(t => t.id);
                        setPlayerState(s => ({ ...s, queue: ids, originalQueue: ids, baseQueueIndex: 0 }));
                      }
                      return [...prev, ...toAdd];
                    });
                  })();
                }}
              >
                Add folder as playlist
              </Button>
            </div>
            {/* Optional: Export/Import play count metadata */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    // Export only play counts to keep file sizes tiny
                    const db = await import('./services/db');
                    const plays = await db.getAll('plays');
                    const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ plays }));
                    const a = document.createElement('a');
                    a.href = dataStr;
                    a.download = `vibe-plays-${Date.now()}.json`;
                    a.click();
                  } catch { }
                }}
              >
                Export data
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'application/json';
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const json = JSON.parse(text);
                      if (json?.plays && Array.isArray(json.plays)) {
                        const db = await import('./services/db');
                        // Best-effort import: write every key/value pair
                        for (const entry of json.plays) {
                          // If exported via getAll, entries may be values without keys.
                          // We expect plays to be an object map; handle both cases.
                        }
                      } else if (json && typeof json === 'object') {
                        const db = await import('./services/db');
                        for (const [key, value] of Object.entries(json)) {
                          if (key === 'plays' && value && typeof value === 'object') {
                            for (const [k, v] of Object.entries(value as any)) {
                              await db.put('plays', k, v as any);
                            }
                          }
                        }
                      }
                    } catch { }
                  };
                  input.click();
                }}
              >
                Import data
              </Button>
            </div>
            {playlists.map(pl => (
              <div key={pl.id} className="flex items-center justify-between py-2 group">
                <div
                  className={`text-sm cursor-pointer truncate ${selectedPlaylistId === pl.id ? 'text-secondary' : 'text-textSub group-hover:text-textMain'}`}
                  onClick={() => {
                    setSelectedPlaylistId(pl.id);
                    setActiveTab('home');
                  }}
                >
                  {pl.name}
                </div>
                <PlaylistActions
                  id={pl.id}
                  onRename={() => {
                    const input = window.prompt('Rename playlist', pl.name);
                    if (!input) return;
                    const name = input.trim();
                    if (!name) return;
                    setPlaylists(prev => prev.map(p => p.id === pl.id ? { ...p, name } : p));
                    // Best-effort: update source name as well
                    (async () => {
                      const src = await getSource(pl.id);
                      if (src) await saveSource(pl.id, name, src.handle);
                    })();
                  }}
                  onChangeFolder={async () => {
                    const handle = await pickDirectory();
                    if (!handle) return;
                    await saveSource(pl.id, pl.name, handle);
                    // Rescan and replace playlist tracks
                    const files = await readAllAudioFromHandle(handle);
                    const jsmediatags = (window as any).jsmediatags;
                    const built = await Promise.all(files.map(async (file, i) => {
                      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                      let artist = "Unknown Artist";
                      let title = baseName;
                      let album = "Local Import";
                      let coverArt = SAMPLE_COVER_ARTS[i % SAMPLE_COVER_ARTS.length];
                      if (jsmediatags) {
                        try {
                          const tags: any = await new Promise((resolve) => {
                            jsmediatags.read(file, {
                              onSuccess: (tag: any) => resolve(tag.tags),
                              onError: () => resolve({}),
                            });
                          });
                          if (tags) {
                            if (tags.title) title = tags.title;
                            if (tags.artist) artist = tags.artist;
                            if (tags.album) album = tags.album;
                            if (tags.picture) {
                              const { data, format } = tags.picture;
                              let base64String = "";
                              for (let j = 0; j < data.length; j++) {
                                base64String += String.fromCharCode(data[j]);
                              }
                              coverArt = `data:${format};base64,${window.btoa(base64String)}`;
                            }
                          }
                        } catch { }
                      }
                      const playCount = await readPlayCount(getTrackKey(file)).catch(() => 0) || 0;
                      return {
                        id: `src-${pl.id}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                        file, title, artist, album, duration: 0,
                        url: URL.createObjectURL(file),
                        playCount, coverArt,
                      } as Track;
                    }));
                    setTracks(prev => {
                      const keyOf = (t: Track) => getTrackKey(t.file);
                      const existingKeys = new Map(prev.map(t => [keyOf(t), t.id]));
                      const toAdd: Track[] = [];
                      const newIdsForPlaylist: string[] = [];
                      for (const t of built) {
                        const k = keyOf(t);
                        const existingId = existingKeys.get(k);
                        if (existingId) newIdsForPlaylist.push(existingId);
                        else { toAdd.push(t); newIdsForPlaylist.push(t.id); }
                      }
                      setPlaylists(pls => pls.map(p => p.id === pl.id ? { ...p, trackIds: newIdsForPlaylist } : p));
                      return [...prev, ...toAdd];
                    });
                  }}
                  onRescan={async () => {
                    const src = await getSource(pl.id);
                    if (!src) { window.alert('No folder saved for this playlist. Use Change folder.'); return; }
                    const files = await readAllAudioFromHandle(src.handle);
                    const jsmediatags = (window as any).jsmediatags;
                    const built = await Promise.all(files.map(async (file, i) => {
                      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                      let artist = "Unknown Artist";
                      let title = baseName;
                      let album = "Local Import";
                      let coverArt = SAMPLE_COVER_ARTS[i % SAMPLE_COVER_ARTS.length];
                      if (jsmediatags) {
                        try {
                          const tags: any = await new Promise((resolve) => {
                            jsmediatags.read(file, {
                              onSuccess: (tag: any) => resolve(tag.tags),
                              onError: () => resolve({}),
                            });
                          });
                          if (tags) {
                            if (tags.title) title = tags.title;
                            if (tags.artist) artist = tags.artist;
                            if (tags.album) album = tags.album;
                            if (tags.picture) {
                              const { data, format } = tags.picture;
                              let base64String = "";
                              for (let j = 0; j < data.length; j++) {
                                base64String += String.fromCharCode(data[j]);
                              }
                              coverArt = `data:${format};base64,${window.btoa(base64String)}`;
                            }
                          }
                        } catch { }
                      }
                      const playCount = await readPlayCount(getTrackKey(file)).catch(() => 0) || 0;
                      return {
                        id: `src-${pl.id}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                        file, title, artist, album, duration: 0,
                        url: URL.createObjectURL(file),
                        playCount, coverArt,
                      } as Track;
                    }));
                    setTracks(prev => {
                      const keyOf = (t: Track) => getTrackKey(t.file);
                      const existingKeys = new Map(prev.map(t => [keyOf(t), t.id]));
                      const toAdd: Track[] = [];
                      const newIdsForPlaylist: string[] = [];
                      for (const t of built) {
                        const k = keyOf(t);
                        const existingId = existingKeys.get(k);
                        if (existingId) newIdsForPlaylist.push(existingId);
                        else { toAdd.push(t); newIdsForPlaylist.push(t.id); }
                      }
                      setPlaylists(pls => pls.map(p => p.id === pl.id ? { ...p, trackIds: newIdsForPlaylist } : p));
                      return [...prev, ...toAdd];
                    });
                  }}
                  onRemove={async () => {
                    if (!window.confirm('Remove this playlist?')) return;
                    setPlaylists(prev => prev.filter(p => p.id !== pl.id));
                    await removeSource(pl.id).catch(() => { });
                    if (selectedPlaylistId === pl.id) setSelectedPlaylistId(null);
                  }}
                />
              </div>
            ))}

            {/* Import Buttons */}
            <div className="mt-4 space-y-3">
              <div
                className={`flex items-center gap-2 text-secondary cursor-pointer hover:underline text-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <Upload size={16} /> Import Files
              </div>
              <div
                className={`flex items-center gap-2 text-secondary cursor-pointer hover:underline text-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isProcessing && folderInputRef.current?.click()}
              >
                <FolderInput size={16} /> Import Folder
              </div>
              {isProcessing && <div className="text-xs text-textSub animate-pulse">Processing metadata...</div>}
            </div>

            <input
              type="file"
              multiple
              accept="audio/*,.lrc,.txt"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              type="file"
              ref={folderInputRef}
              className="hidden"
              onChange={handleFolderUpload}
              {...({ webkitdirectory: "", directory: "" } as any)}
            />
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-surfaceHighlight to-background overflow-hidden relative rounded-lg md:m-2 md:ml-0">
          {/* Views */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {renderViews()}
          </div>

        </div>
      </div>

      {/* --- BOTTOM PLAYER (Music) --- */}
      {currentTrack && !playerState.isExpanded && !activeBook && (
        <div
          className="hidden md:flex h-20 bg-surface border-t border-white/5 px-4 items-center justify-between z-40 relative cursor-pointer md:cursor-auto"
          onClick={(e) => {
            if (window.innerWidth < 768) {
              setPlayerState(s => ({ ...s, isExpanded: true }));
            }
          }}
        >
          {/* Left: Track Info */}
          <div className="flex items-center gap-4 w-1/3 min-w-0">
            <div className="relative group">
              <img
                src={currentTrack.coverArt}
                alt="art"
                className="w-14 h-14 rounded-md object-cover shadow-lg"
              />
              <div
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity cursor-pointer md:hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayerState(s => ({ ...s, isExpanded: true }));
                }}
              >
                <Maximize2 size={20} />
              </div>
            </div>
            <div className="flex flex-col overflow-hidden justify-center">
              <span className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">{currentTrack.title}</span>
              <span className="text-xs text-textSub truncate hover:underline cursor-pointer">{currentTrack.artist}</span>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex flex-col items-center max-w-md w-1/3 px-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-1">
              <PlayerControls
                isPlaying={playerState.isPlaying}
                onPlayPause={togglePlay}
                onNext={nextTrack}
                onPrev={prevTrack}
                shuffleMode={playerState.shuffleMode}
                onToggleShuffle={toggleShuffle}
                repeatMode={playerState.repeatMode}
                onToggleRepeat={() => setPlayerState(s => ({ ...s, repeatMode: s.repeatMode === RepeatMode.OFF ? RepeatMode.ALL : s.repeatMode === RepeatMode.ALL ? RepeatMode.ONE : RepeatMode.OFF }))}
              />
            </div>
            <div className="w-full flex items-center gap-2 text-xs text-textSub font-mono hidden md:flex">
              <span>{formatTime(playerState.progress)}</span>
              <input
                type="range"
                min={0}
                max={currentTrack.duration || 0}
                value={playerState.progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1 h-1 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer accent-white hover:accent-secondary"
              />
              <span>{formatTime(currentTrack.duration || 0)}</span>
            </div>
          </div>

          {/* Right: Extra Controls */}
          <div className="w-1/3 flex justify-end items-center gap-3 hidden md:flex" onClick={e => e.stopPropagation()}>
            {/* Volume */}
            <div className="flex items-center gap-2 min-w-[160px]">
              <Volume2 size={18} className="text-textSub" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={playerState.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-28 h-1 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer accent-white hover:accent-secondary"
              />
            </div>
            {/* Queue toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPlayerState(s => ({ ...s, isQueueOpen: !s.isQueueOpen }))}
              active={!!playerState.isQueueOpen}
              title="Queue"
            >
              <ListMusic size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setPlayerState(s => ({ ...s, isExpanded: true }))} title="Lyrics & Info">
              <Maximize2 size={20} />
            </Button>
          </div>

          {/* Mobile Play/Pause only */}
          <div className="md:hidden flex items-center mr-2" onClick={e => e.stopPropagation()}>
            <Button variant="icon" onClick={togglePlay}>
              {playerState.isPlaying ? <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><div className="w-3 h-3 bg-black" /></div> : <Play size={32} fill="white" />}
            </Button>
          </div>
        </div>
      )}

      {/* --- FULL PLAYER OVERLAY --- */}
      {currentTrack && playerState.isExpanded && (
        <FullPlayer
          track={currentTrack}
          playerState={playerState}
          onCollapse={() => setPlayerState(prev => ({ ...prev, isExpanded: false }))}
          controls={{
            togglePlay,
            next: nextTrack,
            prev: prevTrack,
            toggleShuffle,
            toggleRepeat: () => setPlayerState(s => ({ ...s, repeatMode: s.repeatMode === RepeatMode.OFF ? RepeatMode.ALL : s.repeatMode === RepeatMode.ALL ? RepeatMode.ONE : RepeatMode.OFF })),
            seek
          }}
        />
      )}

      {/* --- QUEUE DRAWER --- */}
      <QueueDrawer
        isOpen={!!playerState.isQueueOpen}
        onClose={() => setPlayerState(s => ({ ...s, isQueueOpen: false }))}
        nowPlaying={currentTrack}
        upNextItems={playerState.upNext.map(id => tracks.find(t => t.id === id)).filter(Boolean) as Track[]}
        upcomingItems={getUpcomingAfterCurrent()}
        onPlay={playFromQueue}
        onClearUpNext={clearUpNext}
      />

      {/* --- AUDIOBOOK PLAYER OVERLAY --- */}
      {activeBook && isAudiobookExpanded && (
        <AudiobookPlayer
          book={activeBook}
          isPlaying={audiobookIsPlaying}
          progress={audiobookProgress}
          speed={audiobookSpeed}
          onCollapse={() => setIsAudiobookExpanded(false)}
          onTogglePlay={audiobookTogglePlay}
          onSeek={audiobookSeek}
          onJump={audiobookJump}
          onSetSpeed={setAudiobookSpeed}
        />
      )}

      {/* --- AUDIOBOOK MINI PLAYER --- */}
      {activeBook && !isAudiobookExpanded && (
        <div className="hidden md:block">
          <AudiobookMiniPlayer
            book={activeBook}
            isPlaying={audiobookIsPlaying}
            progress={audiobookProgress}
            onTogglePlay={audiobookTogglePlay}
            onJump={audiobookJump}
            onSeek={seek}
            onExpand={() => setIsAudiobookExpanded(true)}
            onStop={audiobookStop}
          />
        </div>
      )}

    </div>
  );
};

export default App;