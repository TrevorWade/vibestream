import React from 'react';

export type MobileTab = 'home' | 'search' | 'library';

/**
 * Spotify-style bottom navigation for mobile.
 *
 * Notes:
 * - We intentionally keep labels short and icons consistent.
 * - We keep hit targets large (thumb-friendly).
 */
export function BottomTabs(props: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  items: Array<{ key: MobileTab; label: string; icon: React.ElementType }>;
}) {
  const { active, onChange, items } = props;

  return (
    <nav
      className={[
        'bg-black/70 backdrop-blur-md border-t border-divider',
        'px-2 py-2',
      ].join(' ')}
      aria-label="Bottom navigation"
    >
      <div className="grid grid-cols-3 gap-1">
        {items.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={[
                'flex flex-col items-center justify-center',
                'py-2 rounded-tile',
                'transition-colors',
                isActive ? 'text-textMain' : 'text-textSub',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={22} />
              <span className="text-[11px] font-medium mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

