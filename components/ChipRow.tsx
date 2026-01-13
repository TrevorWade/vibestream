import React from 'react';

/**
 * Horizontal chip row (Spotify-style).
 *
 * Behavior:
 * - Scrolls horizontally when chips overflow
 * - Active chip is green with dark text
 */
export function ChipRow(props: {
  value: string;
  onChange: (value: string) => void;
  chips: Array<{ value: string; label: string }>;
}) {
  const { value, onChange, chips } = props;

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {chips.map((chip) => {
          const isActive = chip.value === value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onChange(chip.value)}
              className={[
                'px-4 py-2 rounded-full text-sm font-semibold',
                'whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-chipActive text-black'
                  : 'bg-chip text-textMain hover:bg-surfaceHighlight',
              ].join(' ')}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

