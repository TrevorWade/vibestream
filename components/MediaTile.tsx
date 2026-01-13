import React from 'react';

/**
 * Quick-access tile used on the Home screen “Good evening” grid.
 *
 * Spotify vibe:
 * - Square-ish thumbnail on the left
 * - Title on the right
 * - Subtle press/hover state
 */
export function MediaTile(props: {
  title: string;
  image?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  const { title, image, icon, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full rounded-tile overflow-hidden',
        'bg-surfaceElevated/80 hover:bg-surfaceHighlight/80',
        'transition-colors',
        'flex items-center',
      ].join(' ')}
    >
      <div className="h-14 w-14 bg-surfaceHighlight flex items-center justify-center overflow-hidden flex-shrink-0">
        {image ? (
          <img
            src={image}
            alt=""
            className="h-14 w-14 object-cover"
            loading="lazy"
          />
        ) : (
          icon
        )}
      </div>
      <div className="px-3 py-3 min-w-0">
        <div className="text-sm font-bold truncate">{title}</div>
      </div>
    </button>
  );
}

