import React from 'react';

/**
 * Simple reusable top header.
 *
 * We keep it intentionally small:
 * - Title on the left
 * - Optional actions on the right
 *
 * This matches the “sticky header” feel of Spotify on mobile.
 */
export function TopHeader(props: {
  title: React.ReactNode;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { title, subtitle, right } = props;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-extrabold tracking-tight truncate">
            {title}
          </div>
          {subtitle ? (
            <div className="text-sm text-textSub truncate">{subtitle}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">{right}</div>
      </div>
    </div>
  );
}

