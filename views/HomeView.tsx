import React, { useMemo, useState } from 'react';
import { ListMusic } from 'lucide-react';
import { Playlist, Track } from '../types';
import { ChipRow } from '../components/ChipRow';
import { MediaTile } from '../components/MediaTile';
import { MediaCard } from '../components/MediaCard';
import { MobileTrackRow } from '../components/MobileTrackRow';

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

  const quickTiles = useMemo(() => {
    // Spotify home usually shows a small set of quick tiles.
    // We keep this deterministic and readable.
    const base = playlists.slice(0, 6);
    const tiles: Array<{ id: string; name: string }> = [
      { id: 'all', name: 'All Songs' },
      ...base.map((p) => ({ id: p.id, name: p.name })),
    ];
    return tiles;
  }, [playlists]);

  const jumpBackIn = useMemo(() => {
    // Simple heuristic: most played tracks.
    // Later we can use history (if we want) for higher fidelity.
    return [...tracks]
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 10);
  }, [tracks]);

  const recent = useMemo(() => {
    // Tracks are appended in upload order, so the last ones are “recent”.
    // We show a small slice to keep the UI fast and scannable.
    const list = [...tracks];
    return list.slice(Math.max(0, list.length - 20)).reverse();
  }, [tracks]);

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
          { value: 'podcasts', label: 'Podcasts' },
          { value: 'audiobooks', label: 'Audiobooks' },
        ]}
      />

      {/* Quick tiles (Spotify "Good evening" grid vibe) */}
      <section className="px-4">
        <div className="grid grid-cols-2 gap-2">
          {quickTiles.map((pl: any) => (
            <MediaTile
              key={pl.id}
              title={pl.name}
              icon={<ListMusic size={20} className="text-textSub" />}
              onClick={() => onOpenPlaylist(pl.id)}
            />
          ))}
        </div>
      </section>

      {/* Jump back in */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-extrabold">Jump back in</div>
          {/* Right side kept empty intentionally (Spotify has icons/actions here). */}
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {jumpBackIn.length === 0 ? (
            <div className="text-sm text-textSub py-6">Play something to see it here.</div>
          ) : (
            jumpBackIn.map((t) => (
              <MediaCard
                key={t.id}
                title={t.title}
                subtitle={t.artist}
                image={t.coverArt}
                onClick={() => onPlayInContext(t.id, allTrackIds)}
              />
            ))
          )}
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

