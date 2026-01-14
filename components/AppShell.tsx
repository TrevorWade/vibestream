import React from 'react';

/**
 * Mobile-first app shell.
 *
 * Why this component exists:
 * - Our old mobile UI was built inline inside `App.tsx`.
 * - Spotify-like apps feel great because they have a consistent shell:
 *   - Sticky top header
 *   - Scrollable content area
 *   - Persistent bottom navigation
 *
 * Important:
 * - This shell is only meant for mobile (`md:hidden` usage).
 * - Desktop keeps its existing layout for now (we can improve later).
 */
export function AppShell(props: {
  header: React.ReactNode;
  children: React.ReactNode;
  bottom: React.ReactNode;
  /**
   * When true, we reserve extra space at the bottom for a mini player
   * that sits above the bottom tabs (Spotify-style).
   */
  hasMiniPlayer?: boolean;
}) {
  const { header, children, bottom, hasMiniPlayer } = props;

  return (
    <div className="md:hidden flex flex-col h-screen overflow-hidden bg-background text-textMain">
      {/* Sticky header area */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-divider vs-safe-top">
        {header}
      </div>

      {/* Scrollable content (we add bottom padding so content isn't hidden by tabs/player) */}
      <div
        className={[
          'flex-1 overflow-y-auto vs-scroll vs-bg-spotify',
          hasMiniPlayer ? 'vs-pad-for-tabs-and-mini' : 'vs-pad-for-tabs',
        ].join(' ')}
      >
        {children}
      </div>

      {/* Bottom area is fixed so it feels like a real app shell. */}
      <div className="fixed left-0 right-0 bottom-0 z-50 vs-safe-bottom">{bottom}</div>
    </div>
  );
}

