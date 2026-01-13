import React, { useMemo, useState } from 'react';
import { Headphones, ListMusic, Plus, Search } from 'lucide-react';
import { ChipRow } from '../components/ChipRow';
import { Playlist, Track } from '../types';

/**
 * Spotify-style Library screen (mobile).
 *
 * Medium-fidelity approach:
 * - We focus on structure, spacing, and hierarchy.
 * - We surface playlists + a “Songs” entry.
 * - We keep actions simple (create playlist button + search icon).
 */
export function LibraryView(props: {
  playlists: Playlist[];
  tracks: Track[];
  onOpenPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onOpenAudiobooks: () => void;
}) {
  const { playlists, tracks, onOpenPlaylist, onCreatePlaylist, onOpenAudiobooks } = props;
  const [chip, setChip] = useState('playlists');

  const items = useMemo(() => {
    // Spotify library is content-first. We show a compact list.
    // “All Songs” is a special entry that maps to our synthetic playlist id.
    return [
      {
        id: 'audiobooks',
        title: 'Audiobooks',
        subtitle: 'Books',
        icon: <Headphones size={18} className="text-accent" />,
      },
      {
        id: 'all',
        title: 'Songs',
        subtitle: `${tracks.length} songs`,
        icon: <ListMusic size={18} className="text-textSub" />,
      },
      ...playlists.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: 'Playlist',
        icon: <ListMusic size={18} className="text-textSub" />,
      })),
    ];
  }, [playlists, tracks.length]);

  return (
    <div className="space-y-3">
      <div className="px-4 pt-2">
        {/* Simple action row (Spotify-style icons on the right) */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-surfaceElevated hover:bg-surfaceHighlight transition-colors flex items-center justify-center"
            title="Search library"
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-surfaceElevated hover:bg-surfaceHighlight transition-colors flex items-center justify-center"
            onClick={onCreatePlaylist}
            title="Create playlist"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <ChipRow
        value={chip}
        onChange={(v) => {
          setChip(v);
          if (v === 'audiobooks') onOpenAudiobooks();
        }}
        chips={[
          { value: 'playlists', label: 'Playlists' },
          { value: 'artists', label: 'Artists' },
          { value: 'albums', label: 'Albums' },
          { value: 'audiobooks', label: 'Audiobooks' },
        ]}
      />

      <div className="px-4">
        <div className="divide-y divide-divider/40">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className="w-full flex items-center gap-3 py-3 hover:bg-white/5 rounded-tile transition-colors"
              onClick={() => {
                if (it.id === 'audiobooks') onOpenAudiobooks();
                else onOpenPlaylist(it.id);
              }}
            >
              <div className="w-12 h-12 rounded-tile bg-surfaceHighlight flex items-center justify-center flex-shrink-0">
                {it.icon}
              </div>
              <div className="min-w-0 text-left flex-1">
                <div className="text-sm font-bold truncate">{it.title}</div>
                <div className="text-xs text-textSub truncate">{it.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Friendly hint for audiobooks */}
      <div className="px-4 pb-2">
        <button
          type="button"
          className="w-full rounded-card border border-divider bg-surfaceElevated p-4 text-left hover:bg-surfaceHighlight transition-colors"
          onClick={onOpenAudiobooks}
        >
          <div className="flex items-center gap-2">
            <Headphones size={18} className="text-accent" />
            <div className="font-bold">Audiobooks</div>
          </div>
          <div className="text-sm text-textSub mt-1">
            Continue listening where you left off.
          </div>
        </button>
      </div>
    </div>
  );
}

