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
 * Robust MP4 Chapter Parser (Streaming / Low-Memory)
 * 
 * Capability:
 * 1. Reads file in chunks using File.slice() to avoid loading 500MB+ into memory.
 * 2. Parses 'moov' atom to find tracks.
 * 3. Supports 'chpl' (Nero) chapters.
 * 4. Supports Text Track chapters (standard M4B):
 *    - Finds the audio track.
 *    - Follows 'tref' (Track Reference) -> 'chap' to find the chapter track.
 *    - Parses the Sample Table (stbl) of the chapter track to get titles and times.
 */
async function extractChapters(file: File): Promise<Chapter[]> {
  try {
    const reader = new Mp4Reader(file);
    return await reader.parse();
  } catch (e) {
    console.error("Chapter extraction failed:", e);
    return [];
  }
}

// --- MP4 PARSER CLASSES ---

class Mp4Reader {
  file: File;
  fileSize: number;

  constructor(file: File) {
    this.file = file;
    this.fileSize = file.size;
  }

  async parse(): Promise<Chapter[]> {
    // 1. Scan top-level atoms for 'moov'
    const moovAtom = await this.findAtom('moov', 0, this.fileSize);
    if (!moovAtom) return [];

    // 2. Parse 'moov' to find 'trak's and optional 'udta' (for chpl)
    const moovData = await this.readAtomBody(moovAtom);

    // Check for Nero 'chpl' in 'udta' first (common in some files)
    const udtaAtom = this.findChildAtom(moovData, 'udta');
    if (udtaAtom) {
      const chplAtom = this.findChildAtom(await this.readAtomBody(udtaAtom), 'chpl');
      if (chplAtom) {
        return this.parseChpl(chplAtom);
      }
    }

    // 3. Find Chapter Track via 'tref' -> 'chap'
    const tracks = await this.parseTracks(moovAtom);
    const chapterTrack = this.identifyChapterTrack(tracks);

    if (chapterTrack) {
      return await this.parseTrackChapters(chapterTrack);
    }

    return [];
  }

  // --- Atom Navigation Helpers ---

  async findAtom(targetType: string, offset: number, limit: number): Promise<AtomHeader | null> {
    let current = offset;
    while (current < limit - 8) {
      const header = await this.readAtomHeader(current);
      if (header.size === 0) break; // Rest of file (or end)

      // If we found our target
      if (header.type === targetType) {
        return header;
      }

      // Calculate total size including header
      const totalSize = header.size === 1 ? Number(header.extendedSize) : header.size;

      // Safety check for invalid sizes to avoid infinite loops
      if (totalSize < 8) break;

      current += totalSize;
    }
    return null;
  }

  async readAtomHeader(offset: number): Promise<AtomHeader> {
    // Read 8 bytes first (Size + Type)
    const view = await this.readView(offset, 8);
    const size = view.getUint32(0);
    const type = this.readString(view, 4, 4);

    if (size === 1) {
      // 64-bit size: Read next 8 bytes
      const extView = await this.readView(offset + 8, 8);
      const extendedSize = extView.getBigUint64(0);
      // Header size is 16 bytes (4+4+8)
      return { type, size, extendedSize, offset, bodyOffset: offset + 16 };
    }

    return { type, size, offset, bodyOffset: offset + 8 };
  }

  async readAtomBody(atom: AtomHeader): Promise<DataView> {
    // Safety check: don't read huge bodies into memory if possible.
    // We strictly use this for parsing container atoms like 'moov' or 'trak' which are small-ish (usually < 1MB)
    // If 'moov' is huge (e.g. contains big 'mdat'), we will crash. But 'moov' is usually metadata.
    return await this.readView(atom.bodyOffset, atom.size - 8);
  }

  // Parses children from an already-loaded DataView (memory)
  findChildAtom(view: DataView, targetType: string): AtomHeader | null {
    let offset = 0;
    while (offset < view.byteLength - 8) {
      const size = view.getUint32(offset);
      const type = this.readString(view, offset + 4, 4);
      if (type === targetType) {
        return { type, size, offset: -1, bodyOffset: -1, buffer: view, bufferOffset: offset + 8, bufferSize: size - 8 }; // Custom handling for buffer-based atoms
      }
      offset += size;
    }
    return null;
  }

  findAllChildAtoms(view: DataView, targetType: string): AtomHeader[] {
    const results: AtomHeader[] = [];
    let offset = 0;
    while (offset < view.byteLength - 8) {
      const size = view.getUint32(offset);
      const type = this.readString(view, offset + 4, 4);
      if (type === targetType) {
        results.push({ type, size, offset: -1, bodyOffset: -1, buffer: view, bufferOffset: offset + 8, bufferSize: size - 8 });
      }
      offset += size;
    }
    return results;
  }

  // --- Specific Logic ---

  async parseTracks(moovAtom: AtomHeader): Promise<ParsedTrack[]> {
    const moovBody = await this.readAtomBody(moovAtom);
    const trackAtoms = this.findAllChildAtoms(moovBody, 'trak');
    const tracks: ParsedTrack[] = [];

    for (const trak of trackAtoms) {
      // Parse "tkhd" to get ID
      const tkhd = this.findChildAtom(this.getBuffer(trak), 'tkhd');
      if (!tkhd) continue;
      const trackId = this.parseTrackId(this.getBuffer(tkhd));

      // Parse "mdia" -> "hdlr" to get type (soun, text, etc)
      const mdia = this.findChildAtom(this.getBuffer(trak), 'mdia');
      if (!mdia) continue;
      const hdlr = this.findChildAtom(this.getBuffer(mdia), 'hdlr');
      if (!hdlr) continue;
      const handlerType = this.parseHandlerType(this.getBuffer(hdlr));

      // Determine references ("tref")
      const refs: number[] = [];
      const tref = this.findChildAtom(this.getBuffer(trak), 'tref');
      if (tref) {
        const chap = this.findChildAtom(this.getBuffer(tref), 'chap');
        if (chap) {
          const refIds = this.parseChapAtomIds(this.getBuffer(chap));
          refs.push(...refIds);
        }
      }

      tracks.push({ id: trackId, type: handlerType, chapRefs: refs, mdiaAtom: mdia });
    }
    return tracks;
  }

  identifyChapterTrack(tracks: ParsedTrack[]): ParsedTrack | null {
    // 1. Look for an audio track that references a chapter track
    const audioTrack = tracks.find(t => t.type === 'soun' && t.chapRefs.length > 0);
    if (audioTrack) {
      const chapId = audioTrack.chapRefs[0];
      return tracks.find(t => t.id === chapId) || null;
    }

    // 2. Fallback: look for a 'text' track
    return tracks.find(t => t.type === 'text') || null;
  }

  async parseTrackChapters(track: ParsedTrack): Promise<Chapter[]> {
    const mdiaBody = this.getBuffer(track.mdiaAtom);
    const minf = this.findChildAtom(mdiaBody, 'minf');
    if (!minf) return [];

    const stbl = this.findChildAtom(this.getBuffer(minf), 'stbl');
    if (!stbl) return [];
    const stblBody = this.getBuffer(stbl);

    // 1. Time-to-Sample (stts) -> Duration of each sample
    const stts = this.findChildAtom(stblBody, 'stts');
    // 2. Sample-to-Chunk (stsc) -> Map samples to chunks
    const stsc = this.findChildAtom(stblBody, 'stsc');
    // 3. Sample Size (stsz) -> Size of each sample
    const stsz = this.findChildAtom(stblBody, 'stsz');
    // 4. Chunk Offset (stco or co64) -> File offset of each chunk
    const stco = this.findChildAtom(stblBody, 'stco');
    const co64 = this.findChildAtom(stblBody, 'co64'); // 64-bit offsets

    if (!stts || !stsc || !stsz || (!stco && !co64)) return [];

    // Parse Tables
    const sampleDurations = this.parseStts(this.getBuffer(stts));
    const sampleToChunk = this.parseStsc(this.getBuffer(stsc));
    const sampleSizes = this.parseStsz(this.getBuffer(stsz));
    const chunkOffsets = stco ? this.parseStco(this.getBuffer(stco)) : this.parseCo64(this.getBuffer(co64!));

    // Resolve sample loop
    const chapters: Chapter[] = [];
    let currentSampleIndex = 0;
    let currentTime = 0;
    const timescale = await this.getMediaTimescale(track.mdiaAtom);

    // Iterate chunks
    for (let c = 0; c < chunkOffsets.length; c++) {
      const chunkOffset = chunkOffsets[c];
      const samplesInChunk = this.getSamplesForChunk(c + 1, sampleToChunk);

      let currentByteOffsetInChunk = 0;

      for (let s = 0; s < samplesInChunk; s++) {
        const globalSampleIndex = currentSampleIndex;
        const size = sampleSizes.length === 1 ? sampleSizes[0] : sampleSizes[globalSampleIndex];
        const duration = sampleDurations[globalSampleIndex] || sampleDurations[0]; // fallback

        // Read the actual text data for the title
        const fileOffset = chunkOffset + currentByteOffsetInChunk;

        // OPTIMIZATION: Only read the title string, not the whole file
        const title = await this.readTitleAt(fileOffset, size);

        if (title && title.trim().length > 0) {
          chapters.push({
            title: title.trim(),
            startTime: currentTime / timescale
          });
        }

        currentTime += duration;
        currentByteOffsetInChunk += size;
        currentSampleIndex++;
      }
    }

    return chapters;
  }

  // --- Parsing Internals ---

  parseChpl(chplAtom: AtomHeader): Chapter[] {
    const view = this.getBuffer(chplAtom);
    const version = view.getUint8(8); // Offset into buffer. buffer starts at body.
    // Careful: findChildAtom returns a view of the BODY/Container, but here we passed the 'chpl' atom which is a LEAF.
    // wait, findChildAtom implementation above returns { buffer: view, bufferOffset: offset+8 }.
    // So 'view' is the container's body.
    // Actually, my structure is slightly complex. wrapper 'getBuffer' handles extracting the sub-slice.

    // Let's simplified Chpl parsing:
    // Chpl is a full atom: Size(4) Type(4) Version(1) Flags(3) ...
    // My getBuffer returns the BODY (skipping header). 
    // Wait, 'chpl' is a full atom, which means it has Version/Flags inside the BODY.

    // Structure:
    // 0: Version (1 byte)
    // 1-3: Flags (3 bytes)
    // 4: ??? Reserved? 
    // Actually standard FullAtom header inside Body is: Version(1), Flags(3). So 4 bytes.
    // Nero chpl:
    // Offset 4: Chapter Count (byte)? No.
    // Let's follow the known spec or previous code.
    // Previous code: offset+8 was version. offset+12 was counts.
    // That assumed 'view' started at the ATOM START (header).
    // Here, 'getBuffer' returns the BODY.
    // So Version is at 0.
    // Spec:
    // Version (1), Flags (3), Reserved (1), Count (1 byte? or int32?)
    // Actually usually: Version(1), Flags(3), Application(4?), Count(1)

    // Let's stick to the previous code logic adaptation:
    // Previous: offset + 8 (Version), offset + 12 (Start of Chpl specific).
    // My Body View: 0 (Version), 4 (Start of Chpl specific? No, header is 8 bytes. so Body[0] is byte 8).

    const v = view.getUint8(0);
    // previous: gap of 4 bytes (12-8). So skip 3 flags + 1 something.
    let off = 4;

    const count = view.getUint8(off);
    off += 1;

    const chapters: Chapter[] = [];
    for (let i = 0; i < count; i++) {
      if (off >= view.byteLength) break;

      let start = 0;
      if (v === 1) {
        start = Number(view.getBigUint64(off)) / 10000000;
        off += 8;
      } else {
        start = view.getUint32(off) / 10000000;
        off += 4;
      }

      const len = view.getUint8(off);
      off += 1;

      const titleBytes = new Uint8Array(view.buffer, view.byteOffset + off, len);
      const title = new TextDecoder().decode(titleBytes);
      off += len;

      chapters.push({ title, startTime: start });
    }
    return chapters;
  }

  async getMediaTimescale(mdiaAtom: AtomHeader): Promise<number> {
    const mdiaBody = this.getBuffer(mdiaAtom);
    const mdhd = this.findChildAtom(mdiaBody, 'mdhd');
    if (!mdhd) return 48000; // default
    const view = this.getBuffer(mdhd);
    // FullAtom: Version(1) Flags(3)
    const version = view.getUint8(0);
    // If v1: Creation(8), Mod(8), Timescale(4) -> offset 16
    // If v0: Creation(4), Mod(4), Timescale(4) -> offset 8
    const offset = version === 1 ? 16 : 8;
    return view.getUint32(offset);
  }

  getSamplesForChunk(chunkIndex: number, stsc: StscEntry[]): number {
    // stsc is run-length encoded.
    // finding the entry that covers chunkIndex
    for (let i = 0; i < stsc.length; i++) {
      const entry = stsc[i];
      const nextEntry = stsc[i + 1];
      // If this is the last entry, or the next entry starts after our chunk
      if (!nextEntry || chunkIndex < nextEntry.firstChunk) {
        return entry.samplesPerChunk;
      }
    }
    return 0;
  }

  // --- Helpers ---

  async readTitleAt(offset: number, length: number): Promise<string> {
    if (length <= 2) return ""; // Skip the 16-bit length prefix typical in text references or small samples
    const view = await this.readView(offset, length);
    // QuickTime text samples often start with a 16-bit length.
    const textLen = view.getUint16(0);

    if (textLen === length - 2) {
      // It's a Pascal-style string with 2-byte length header? Or standard MP4 text sample: 
      // 2 bytes length, then string.
      return this.readString(view, 2, textLen);
    }
    // Sometimes it's just raw text
    return this.readString(view, 0, length);
  }

  getBuffer(atom: AtomHeader | null): DataView {
    if (!atom) return new DataView(new ArrayBuffer(0));
    // AtomHeader produced by findChildAtom has special 'buffer' props
    if ((atom as any).buffer) {
      const a = atom as any;
      return new DataView(a.buffer.buffer, a.buffer.byteOffset + a.bufferOffset, a.bufferSize);
    }
    return new DataView(new ArrayBuffer(0));
  }

  async readView(offset: number, size: number): Promise<DataView> {
    const chunk = this.file.slice(offset, offset + size);
    return new DataView(await chunk.arrayBuffer());
  }

  readString(view: DataView, offset: number, length: number): string {
    const buf = new Uint8Array(view.buffer, view.byteOffset + offset, length);
    return new TextDecoder().decode(buf);
  }

  // -- Table Parsers --

  parseTrackId(tkhdBody: DataView): number {
    // FullAtom: v(1) f(3).
    const version = tkhdBody.getUint8(0);
    // v0: Creating(4), Mod(4), ID(4) -> offset 8
    // v1: Creating(8), Mod(8), ID(4) -> offset 16
    const offset = version === 1 ? 16 : 8;
    return tkhdBody.getUint32(offset);
  }

  parseHandlerType(hdlrBody: DataView): string {
    // FullAtom v(1) f(3)
    // Predefined(4), HandlerType(4) -> offset 8
    return this.readString(hdlrBody, 8, 4);
  }

  parseChapAtomIds(chapBody: DataView): number[] {
    // Each reference is a 32-bit track ID.
    const ids: number[] = [];
    for (let i = 0; i < chapBody.byteLength; i += 4) {
      ids.push(chapBody.getUint32(i));
    }
    return ids;
  }

  parseStts(view: DataView): number[] { // Returns flattened array of durations per sample? No, that's too big.
    // STTS is run-length. Count | Deltas.
    // We should probably return the raw entries to save memory and process on demand, 
    // but for simple chapter tracks (usually < 100 chapters), expanding is fine.
    const count = view.getUint32(4); // entry count
    const durations: number[] = [];
    let offset = 8;
    for (let i = 0; i < count; i++) {
      const sampleCount = view.getUint32(offset);
      const sampleDelta = view.getUint32(offset + 4);
      offset += 8;
      for (let j = 0; j < sampleCount; j++) durations.push(sampleDelta);
    }
    return durations;
  }

  parseStsc(view: DataView): StscEntry[] {
    const count = view.getUint32(4);
    const entries: StscEntry[] = [];
    let offset = 8;
    for (let i = 0; i < count; i++) {
      entries.push({
        firstChunk: view.getUint32(offset),
        samplesPerChunk: view.getUint32(offset + 4),
        sampleDescriptionIndex: view.getUint32(offset + 8)
      });
      offset += 12;
    }
    return entries;
  }

  parseStsz(view: DataView): number[] {
    const sampleSize = view.getUint32(4);
    const count = view.getUint32(8);
    if (sampleSize !== 0) {
      // Uniform size
      return [sampleSize];
    }
    const sizes: number[] = [];
    let offset = 12;
    for (let i = 0; i < count; i++) {
      sizes.push(view.getUint32(offset));
      offset += 4;
    }
    return sizes;
  }

  parseStco(view: DataView): number[] {
    const count = view.getUint32(4);
    const offsets: number[] = [];
    let off = 8;
    for (let i = 0; i < count; i++) {
      offsets.push(view.getUint32(off));
      off += 4;
    }
    return offsets;
  }

  parseCo64(view: DataView): number[] { // 64-bit offsets
    const count = view.getUint32(4);
    const offsets: number[] = [];
    let off = 8;
    for (let i = 0; i < count; i++) {
      offsets.push(Number(view.getBigUint64(off)));
      off += 8;
    }
    return offsets;
  }

}

interface AtomHeader {
  type: string;
  size: number;
  offset: number;     // Absolute file offset
  bodyOffset: number; // Absolute file offset where body starts
  extendedSize?: bigint;
  // For memory-resident atoms (parsed from DataView)
  buffer?: DataView;
  bufferOffset?: number;
  bufferSize?: number;
}

interface ParsedTrack {
  id: number;
  type: string;
  chapRefs: number[];
  mdiaAtom: AtomHeader;
}

interface StscEntry {
  firstChunk: number;
  samplesPerChunk: number;
  sampleDescriptionIndex: number;
}

