import React from 'react';

/**
 * Small card for horizontal carousels (e.g. “Jump back in”).
 */
export function MediaCard(props: {
  title: string;
  subtitle?: string;
  image?: string;
  onClick?: () => void;
}) {
  const { title, subtitle, image, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-[160px] flex-shrink-0 text-left',
        'bg-surfaceElevated rounded-card p-3',
        'hover:bg-surfaceHighlight transition-colors',
      ].join(' ')}
    >
      <div className="w-full aspect-square rounded-tile overflow-hidden bg-surfaceHighlight mb-3">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="text-sm font-bold leading-tight line-clamp-2">{title}</div>
      {subtitle ? (
        <div className="text-xs text-textSub mt-1 line-clamp-1">{subtitle}</div>
      ) : null}
    </button>
  );
}

