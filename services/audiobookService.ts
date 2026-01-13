import { Audiobook, Chapter, Bookmark, AudiobookSource } from '../types';
import { get, put, remove, getAll, getAllKeys } from './db';
import { parseBlob, IAudioMetadata, IPicture } from 'music-metadata-browser';

// Stable key for audiobooks
export function getBookKey(file: File): string {
  return `book|${file.name}|${file.size}|${file.lastModified}`;
}

export async function saveAudiobookMetadata(book: Audiobook): Promise<void> {
  await put('audiobooks', book.id, book);
}

export async function getAudiobookMetadata(id: string): Promise<Audiobook | undefined> {
  return await get('audiobooks', id);
}

export async function getAllAudiobooks(): Promise<Audiobook[]> {
  return await getAll('audiobooks');
}

export async function savePlaybackPosition(bookId: string, position: number): Promise<void> {
  await put('audiobook_positions', bookId, position);
}

export async function getPlaybackPosition(bookId: string): Promise<number> {
  const pos = await get<number>('audiobook_positions', bookId);
  return pos || 0;
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  await put('bookmarks', bookmark.id, bookmark);
}

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  const all = await getAll<Bookmark>('bookmarks');
  return all.filter(b => b.bookId === bookId).sort((a, b) => a.timestamp - b.timestamp);
}

export async function deleteBookmark(id: string): Promise<void> {
  await remove('bookmarks', id);
}

/**
 * Remove an audiobook entry from the user's library.
 * This does NOT delete listening position or bookmarks. That's a separate choice.
 */
export async function deleteAudiobook(id: string): Promise<void> {
  await remove('audiobooks', id);
}

/**
 * Delete *all* state for a book (progress + bookmarks).
 * We keep this separate from deleteAudiobook() so the UI can prompt the user.
 */
export async function deleteAudiobookState(bookId: string): Promise<void> {
  await remove('audiobook_positions', bookId);
  await deleteBookmarksForBook(bookId);
}

/**
 * Delete all bookmarks for a specific book.
 * Bookmarks are stored by bookmark.id, so we filter values and delete matching ids.
 */
export async function deleteBookmarksForBook(bookId: string): Promise<void> {
  const all = await getAll<Bookmark>('bookmarks');
  const toDelete = all.filter(b => b.bookId === bookId);
  for (const bm of toDelete) {
    await remove('bookmarks', bm.id);
  }
}

// --- AUDIOBOOK SOURCE PERSISTENCE (Directory Handles) ---

/**
 * Save a directory handle and file path for an audiobook.
 * This allows us to re-access the audiobook file on app reload.
 */
export async function saveAudiobookSource(
  bookId: string,
  handle: FileSystemDirectoryHandle,
  filePath: string,
  folderName?: string
): Promise<void> {
  const source: AudiobookSource = {
    bookId,
    handle,
    filePath,
    folderName: folderName || handle.name,
    lastAccessed: Date.now()
  };
  await put('audiobook_sources', bookId, source);
}

/**
 * Get the saved directory handle and file path for an audiobook.
 */
export async function getAudiobookSource(bookId: string): Promise<AudiobookSource | undefined> {
  return await get<AudiobookSource>('audiobook_sources', bookId);
}

/**
 * Get all saved audiobook sources.
 */
export async function getAllAudiobookSources(): Promise<AudiobookSource[]> {
  const sources = await getAll<AudiobookSource>('audiobook_sources');
  return sources;
}

/**
 * Remove a saved audiobook source.
 */
export async function removeAudiobookSource(bookId: string): Promise<void> {
  await remove('audiobook_sources', bookId);
}

/**
 * Helper function to navigate a directory handle and retrieve a file by path.
 * Handles nested paths like "Author/BookTitle.m4b".
 */
async function getFileFromHandle(
  dirHandle: FileSystemDirectoryHandle,
  filePath: string
): Promise<File> {
  const pathParts = filePath.split('/').filter(p => p.length > 0);
  let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = dirHandle;

  // Navigate through directories
  for (let i = 0; i < pathParts.length - 1; i++) {
    if (currentHandle.kind === 'directory') {
      currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(pathParts[i]);
    }
  }

  // Get the final file
  const fileName = pathParts[pathParts.length - 1];
  const fileHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(fileName);
  return await fileHandle.getFile();
}

/**
 * Rebuild an Audiobook object from a saved source.
 * This recreates the File object and all necessary metadata.
 */
export async function rebuildAudiobookFromHandle(
  source: AudiobookSource,
  existingMetadata?: Partial<Audiobook>
): Promise<Audiobook> {
  // Get the file from the directory handle
  const file = await getFileFromHandle(source.handle, source.filePath);
  
  // If we have existing metadata, use it; otherwise extract fresh
  let metadata: Partial<Audiobook> = existingMetadata || {};
  
  const needsExtraction =
    !metadata.title ||
    !metadata.coverArt ||
    !metadata.chapters ||
    metadata.chapters.length === 0;

  if (needsExtraction) {
    const extracted = await extractMetadata(file);
    metadata = { ...extracted, ...metadata };
  }

  // Build the complete audiobook object
  const book: Audiobook = {
    id: source.bookId,
    file,
    filePath: source.filePath,
    title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
    author: metadata.author || 'Unknown Author',
    narrator: metadata.narrator,
    duration: metadata.duration || 0,
    url: URL.createObjectURL(file),
    coverArt: metadata.coverArt,
    chapters: metadata.chapters || [{ title: "Start", startTime: 0 }]
  };

  try {
    await saveAudiobookMetadata(book);
  } catch (err) {
    console.warn('Failed to persist audiobook metadata after rebuild:', err);
  }
  return book;
}

// --- USER PREFERENCES (Last Played Book) ---

/**
 * Save the last played audiobook ID.
 */
export async function saveLastPlayedBook(bookId: string): Promise<void> {
  await put('preferences', 'lastPlayedAudiobookId', bookId);
}

/**
 * Get the last played audiobook ID.
 */
export async function getLastPlayedBook(): Promise<string | undefined> {
  return await get<string>('preferences', 'lastPlayedAudiobookId');
}

// Metadata extraction using jsmediatags (assumed to be on window)
export async function extractMetadata(file: File): Promise<Partial<Audiobook>> {
  try {
    const metadata = await parseBlob(file);
    const primaryCover =
      convertPicture(metadata.common.picture?.[0]) || extractNativeCover(metadata);
    const coverArt = primaryCover || (await extractCoverUsingJsMediaTags(file));
    const chaptersFromMetadata = parseMmChapters(metadata);
    const fallbackChapters = await resolveChapters(file, chaptersFromMetadata);

    return {
      title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ""),
      author: metadata.common.artist || metadata.common.albumartist || 'Unknown Author',
      narrator: metadata.common.comment?.[0] || '',
      coverArt,
      chapters: fallbackChapters,
    };
  } catch (error) {
    console.warn('music-metadata-browser failed:', error);
    const chapters = await resolveChapters(file);
    const fallbackCover = await extractCoverUsingJsMediaTags(file);
    return {
      title: file.name.replace(/\.[^/.]+$/, ""),
      author: "Unknown Author",
      coverArt: fallbackCover,
      chapters,
    };
  }
}

function convertPicture(picture?: IPicture): string | undefined {
  if (!picture?.data || !picture.format) return undefined;
  return convertPictureData(picture.format, picture.data);
}

function convertPictureData(format: string, data: Uint8Array | ArrayBuffer | number[]): string | undefined {
  const bytes = data instanceof Uint8Array
    ? data
    : data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data);

  let base64String = '';
  for (let i = 0; i < bytes.length; i++) {
    base64String += String.fromCharCode(bytes[i]);
  }
  try {
    return `data:${format};base64,${window.btoa(base64String)}`;
  } catch (err) {
    console.warn('Cover art encoding failed', err);
    return undefined;
  }
}

function extractNativeCover(metadata: IAudioMetadata): string | undefined {
  const native = metadata.native || {};
  for (const tags of Object.values(native)) {
    if (!Array.isArray(tags)) continue;
    for (const tag of tags) {
      const candidate =
        normalizePictureValue(tag?.value) ||
        normalizePictureValue(tag);
      if (candidate) return candidate;
    }
  }
  return undefined;
}

function normalizePictureValue(value: any): string | undefined {
  if (!value) return undefined;
  const format = value.format || value.mime || 'image/jpeg';
  const data = value.data || value.picture || value.value;
  if (!data) return undefined;
  return convertPictureData(format, data);
}

async function extractCoverUsingJsMediaTags(file: File): Promise<string | undefined> {
  const jsmediatags = (window as any)?.jsmediatags;
  if (!jsmediatags) return undefined;
  return new Promise(resolve => {
    jsmediatags.read(file, {
      onSuccess: (tag: any) => {
        const picture = tag?.tags?.picture;
        if (picture && picture.data && picture.format) {
          resolve(convertPictureData(picture.format, picture.data));
          return;
        }
        resolve(undefined);
      },
      onError: () => resolve(undefined),
    });
  });
}

function parseMmChapters(metadata: IAudioMetadata): Chapter[] {
  const rawChapters = metadata.format.chapters;
  if (!rawChapters?.length) return [];
  const sampleRate = metadata.format.sampleRate || 48000;
  return rawChapters.map((chapter, index) => {
    const startTime =
      typeof chapter.sampleOffset === 'number'
        ? chapter.sampleOffset / Math.max(sampleRate, 1)
        : 0;
    return {
      title: chapter.title?.trim() || `Chapter ${index + 1}`,
      startTime: Number.isFinite(startTime) ? startTime : 0,
    };
  });
}

async function resolveChapters(file: File, baseChapters?: Chapter[]): Promise<Chapter[]> {
  if (baseChapters && baseChapters.length > 0) return baseChapters;
  const chapters = await extractChapters(file);
  return chapters.length > 0 ? chapters : [{ title: "Start", startTime: 0 }];
}

/**
 * Robust MP4 Chapter Parser
 * Searches for 'chpl' atoms and 'text' track chapters.
 * Handles moov atom at the beginning or end of file.
 */
async function extractChapters(file: File): Promise<Chapter[]> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    return findChaptersInAtoms(view, 0, view.byteLength);
  } catch (e) {
    console.error("Advanced chapter extraction failed:", e);
    return [];
  }
}

function findChaptersInAtoms(view: DataView, offset: number, length: number): Chapter[] {
  let chapters: Chapter[] = [];
  let currentPos = offset;

  while (currentPos < offset + length - 8) {
    const size = view.getUint32(currentPos);
    const type = String.fromCharCode(
      view.getUint8(currentPos + 4),
      view.getUint8(currentPos + 5),
      view.getUint8(currentPos + 6),
      view.getUint8(currentPos + 7)
    );

    if (size === 0) break;

    // Container atoms we want to dive into
    if (['moov', 'udta', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) {
      const nested = findChaptersInAtoms(view, currentPos + 8, size - 8);
      if (nested.length > 0) return nested;
    }

    // QuickTime / Nero 'chpl' atom
    if (type === 'chpl') {
      return parseChplAtom(view, currentPos, size);
    }

    currentPos += size;
  }

  return chapters;
}

function parseChplAtom(view: DataView, offset: number, size: number): Chapter[] {
  const chapters: Chapter[] = [];
  const version = view.getUint8(offset + 8);
  
  let chOffset = offset + 12; // Skip size, type, version, flags
  
  // QuickTime 'chpl' version 1 uses 64-bit timestamps.
  // Version 0 uses 32-bit.
  const chapterCount = view.getUint8(chOffset);
  chOffset += 1;

  for (let i = 0; i < chapterCount; i++) {
    if (chOffset + (version === 1 ? 9 : 5) > offset + size) break;
    
    let startTime = 0;
    if (version === 1) {
      const timeUnits = view.getBigUint64(chOffset);
      startTime = Number(timeUnits) / 10_000_000;
      chOffset += 8;
    } else {
      const timeUnits = view.getUint32(chOffset);
      startTime = timeUnits / 10_000_000;
      chOffset += 4;
    }
    
    const titleLen = view.getUint8(chOffset);
    chOffset += 1;

    if (chOffset + titleLen > offset + size) break;
    const titleBuffer = view.buffer.slice(view.byteOffset + chOffset, view.byteOffset + chOffset + titleLen);
    const title = new TextDecoder().decode(titleBuffer);
    chOffset += titleLen;

    chapters.push({ title: title || `Chapter ${i + 1}`, startTime });
  }

  return chapters;
}
