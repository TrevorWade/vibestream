import React, { useMemo, useState } from 'react';
import { Playlist, Track } from '../types';
import { ChipRow } from '../components/ChipRow';
import { MobileTrackRow } from '../components/MobileTrackRow';

import { ListMusic } from 'lucide-react';
import { MediaTile } from '../components/MediaTile';

/**
 * Spotify-style Home screen (mobile).
 *
 * What we focus on:
 * - Chip row (All / Music / Podcasts / Audiobooks)
 * - Quick-access grid tiles (2 columns)
 * - “Jump back in” horizontal carousel
 * - A clean, mobile-friendly “Recently added” list
 *
 * What we intentionally keep simple:
 * - Chips do not filter content yet (medium fidelity target)
 * - We use existing playlist/track data only (no remote API)
 */
export function HomeView(props: {
  playlists: Playlist[];
  tracks: Track[];
  currentTrackId: string | null;
  onOpenPlaylist: (playlistId: string) => void;
  onPlayInContext: (trackId: string, contextIds: string[]) => void;
  onOpenAudiobooks?: () => void;
}) {
  const { playlists, tracks, currentTrackId, onOpenPlaylist, onPlayInContext, onOpenAudiobooks } = props;
  const [chip, setChip] = useState('all');

  const allTrackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);

  const recent = useMemo(() => {
    // Tracks are appended in upload order, so the last ones are “recent”.
    // We show a small slice to keep the UI fast and scannable.
    const list = [...tracks];
    // Show last 100 items (reversed so newest first)
    return list.slice(-100).reverse();
  }, [tracks]);

  const recentPlaylists = useMemo(() => {
    // Show last 6 playlists
    return [...playlists].slice(-6).reverse();
  }, [playlists]);

  return (
    <div className="space-y-5">
      <ChipRow
        value={chip}
        onChange={(v) => {
          setChip(v);
          // On mobile, users expect “Audiobooks” to actually take them to audiobooks,
          // not just highlight a chip.
          if (v === 'audiobooks') onOpenAudiobooks?.();
        }}
        chips={[
          { value: 'all', label: 'All' },
          { value: 'music', label: 'Music' },
          { value: 'audiobooks', label: 'Audiobooks' },
        ]}
      />

      {/* Recents Grid (Playlists) */}
      <section className="px-4">
        <div className="grid grid-cols-2 gap-2">
          {recentPlaylists.map(pl => {
            // Find cover art from first track
            const firstTrackId = pl.trackIds[0];
            const firstTrack = firstTrackId ? tracks.find(t => t.id === firstTrackId) : null;
            const art = firstTrack?.coverArt;

            return (
              <MediaTile
                key={pl.id}
                title={pl.name}
                image={art}
                icon={<ListMusic className="text-textSub" />}
                onClick={() => onOpenPlaylist(pl.id)}
              />
            );
          })}
        </div>
      </section>

      {/* Recently added */}
      <section className="px-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-extrabold">Recently added</div>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-card border border-divider bg-surfaceElevated p-4 text-textSub">
            <div className="font-semibold text-textMain mb-1">No music found</div>
            <div className="text-sm">
              Import a folder to start building your library.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-divider/40">
            {recent.map((t) => (
              <MobileTrackRow
                key={t.id}
                track={t}
                isPlaying={t.id === currentTrackId}
                onPlay={() => onPlayInContext(t.id, allTrackIds)}
                onMore={() => {
                  // Medium-fidelity: keep the UI button, wire actions later.
                  // We intentionally avoid adding complex menus right now.
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Small visual footer spacing */}
      <div className="h-2" />
    </div>
  );
}

