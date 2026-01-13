import React, { useMemo, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';

/**
 * Spotify-style Search screen (mobile).
 *
 * Medium-fidelity approach:
 * - We build the layout/feel (search bar + browse grid).
 * - We do not implement a full search engine yet.
 */
export function SearchView() {
  const [query, setQuery] = useState('');

  const categories = useMemo(() => {
    // Hard-coded “Browse all” categories for now.
    // This matches Spotify’s visual density without requiring a backend.
    return [
      { title: 'Pop', from: '#E13300', to: '#B51800' },
      { title: 'Hip-Hop', from: '#7358FF', to: '#4029D8' },
      { title: 'Rock', from: '#E8115B', to: '#9D0B3E' },
      { title: 'Electronic', from: '#00A0C6', to: '#00607A' },
      { title: 'Indie', from: '#00B368', to: '#007A46' },
      { title: 'Workout', from: '#FF8C00', to: '#C96700' },
      { title: 'Chill', from: '#2D46B9', to: '#182E8C' },
      { title: 'Mood', from: '#AF2896', to: '#7A1B68' },
    ];
  }, []);

  return (
    <div className="pb-4">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-4">
        <div
          className={[
            'flex items-center gap-2',
            'bg-white text-black',
            'rounded-full px-4 py-3',
          ].join(' ')}
        >
          <SearchIcon size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-transparent outline-none text-sm font-semibold placeholder:text-black/60"
            inputMode="search"
          />
        </div>

        {query ? (
          <div className="text-xs text-textSub mt-2">
            Search isn’t wired yet. This screen is focused on the Spotify-like layout.
          </div>
        ) : null}
      </div>

      {/* Browse grid */}
      <div className="px-4">
        <div className="text-lg font-extrabold mb-3">Browse all</div>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => (
            <button
              key={c.title}
              type="button"
              className="relative overflow-hidden rounded-card h-[96px] text-left p-3"
              style={{
                background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`,
              }}
            >
              <div className="text-base font-extrabold">{c.title}</div>
              {/* Decorative corner block to mimic Spotify’s “art tile” feel */}
              <div className="absolute -right-6 -bottom-6 w-16 h-16 rotate-12 bg-black/25 rounded-2xl" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

