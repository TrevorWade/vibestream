export interface Track {
  id: string;
  file: File;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  url: string;
  playCount: number;
  lyrics?: string;
  coverArt?: string; // Data URL
}

export interface Audiobook {
  id: string;
  file: File;
  filePath?: string; // Relative path within directory, for persistence
  title: string;
  author: string;
  narrator?: string;
  duration: number; // in seconds
  url: string;
  coverArt?: string; // Data URL
  chapters: Chapter[];
}

export interface Chapter {
  title: string;
  startTime: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  timestamp: number;
  note?: string;
  createdAt: number;
}

export interface AudiobookSource {
  bookId: string;
  handle: FileSystemDirectoryHandle;
  filePath: string; // Relative path to the audiobook file
  folderName: string; // Display name
  lastAccessed: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

export enum ShuffleMode {
  OFF = 'OFF',
  TRUE = 'TRUE',
  SMART = 'SMART' // Weights tracks by inverse play count (plays less heard songs)
}

export enum RepeatMode {
  OFF = 'OFF',
  ALL = 'ALL',
  ONE = 'ONE'
}

export interface PlayerState {
  currentTrackId: string | null;
  isPlaying: boolean;
  volume: number;
  progress: number; // current time in seconds
  queue: string[]; // List of track IDs
  originalQueue: string[]; // Backup for unshuffling
  shuffleMode: ShuffleMode;
  repeatMode: RepeatMode;
  history: string[]; // Track IDs
  isExpanded: boolean; // For mobile/full screen view
  upNext: string[]; // Tracks to play next (FIFO)
  isQueueOpen?: boolean; // Right-side queue drawer visibility
  baseQueueIndex: number; // Index in the base queue, unaffected by Up Next
}
