## Mobile UI test plan (Spotify-style shell)

These are quick manual checks to confirm the new mobile shell feels “app-like” and doesn’t regress playback.

### Setup
- **Run dev server**: `npm run dev`
- **Open on phone**: use the “Network” URL that Vite prints (same Wi‑Fi).
- **Or** open Chrome DevTools device emulation at a phone width (e.g. 390×844).

### Home
- **Sticky header**: scroll; the header stays pinned and content scrolls under it.
- **Chips**: swipe chips horizontally; tap a chip; it highlights green.
- **Quick tiles**: tap a tile; it opens the playlist detail view.
- **Jump back in carousel**: swipe horizontally; tap a card; it starts playback.
- **Recently added**: tap a row; it starts playback; the playing row should visually change.

### Search
- **Bottom tabs**: tap “Search”; it switches immediately.
- **Search bar**: tap input; keyboard opens; typing shows the helper text (we haven’t wired real search yet).
- **Browse grid**: scroll; category cards are readable and tappable.

### Library
- **Bottom tabs**: tap “Library”; it switches immediately.
- **Chips**: swipe chips horizontally; tap “Audiobooks”; it opens the Audiobooks section.
- **Playlists list**: tap “Songs” or a playlist; it opens the playlist detail view.
- **Create playlist**: tap the “+” icon; create a playlist; it appears in the list.

### Mini player + bottom tabs (safe area)
- **Mini player placement**: start playback; ensure the mini player sits **above** the bottom tabs.
- **No overlap**: scroll content; ensure last list items are not hidden behind tabs/mini player.
- **Tap targets**: play/pause on the mini player works and does not trigger unwanted navigation.

### Full player overlay
- **Expand**: tap the mini player; full player opens.
- **Back**: collapse the full player; you return to the same tab and scroll position is reasonable.

### Regression checks (must not break)
- **Desktop**: open in a desktop browser; sidebar + main content still render.
- **Build**: `npm run build` succeeds.

