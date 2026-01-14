import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { FolderPlus, BookOpen } from 'lucide-react';
import { Audiobook } from '../types';
import { Button } from './Button';
import { AudiobookTile } from './AudiobookTile';
import { ConfirmModal } from './ConfirmModal';
import {
  getAllAudiobooks,
  extractMetadata,
  saveAudiobookMetadata,
  getPlaybackPosition,
  getBookKey,
  deleteAudiobook,
  deleteAudiobookState,
  saveAudiobookSource,
  removeAudiobookSource,
  getAudiobookSource,
  getAllAudiobookSources,
  rebuildAudiobookFromHandle,
  getLastPlayedBook
} from '../services/audiobookService';

interface AudiobookLibraryProps {
  onSelectBook: (book: Audiobook) => void;
}

export interface AudiobookLibraryHandle {
  triggerImport: () => void;
}

type ImportStatus = 'pending' | 'processing' | 'done' | 'error';

type ImportItem = {
  id: string;
  name: string;
  title: string;
  author?: string;
  coverArt?: string;
  status: ImportStatus;
  progress: number; // 0..100 (drives the fill animation)
};

export const AudiobookLibrary = forwardRef<AudiobookLibraryHandle, AudiobookLibraryProps>(({ onSelectBook }, ref) => {
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = useState(false);
  const [booksNeedingRefresh, setBooksNeedingRefresh] = useState<Set<string>>(new Set());
  const [removeBookTarget, setRemoveBookTarget] = useState<Audiobook | null>(null);
  const [deleteData, setDeleteData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    triggerImport
  }));

  useEffect(() => {
    loadBooks();
    rehydrateAudiobooks();
  }, []);

  // Automatically reload audiobooks from saved directory handles
  const rehydrateAudiobooks = async () => {
    try {
      const sources = await getAllAudiobookSources();
      if (sources.length === 0) return;

      const rehydrated: Audiobook[] = [];
      const needingRefresh = new Set<string>();

      // Process serially to avoid jamming the IDB/File handles on startup
      for (const source of sources) {
        try {
          // Verify we can verify the directory handle
          await source.handle.getDirectoryHandle('.');

          // Attempt to resolve the specific file to ensure it still exists.
          // source.filePath is relative to the handle.
          // We need to walk the path to verify existence.
          const parts = source.filePath.split('/').filter(p => p && p !== '.');
          let currentHandle = source.handle;

          // Verify full path exists
          for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
          }
          // specific verification of the file
          await currentHandle.getFileHandle(parts[parts.length - 1]);

          // If we get here, we have permission and file exists
          const existingMetadata = await getAllAudiobooks().then(books =>
            books.find(b => b.id === source.bookId)
          );

          const book = await rebuildAudiobookFromHandle(source, existingMetadata);
          rehydrated.push(book);

          // Update the last accessed time
          await saveAudiobookSource(
            source.bookId,
            source.handle,
            source.filePath,
            source.folderName
          );
        } catch (err) {
          console.warn(`Failed to access audiobook ${source.bookId}:`, err);
          needingRefresh.add(source.bookId);
        }
      }

      setBooksNeedingRefresh(prev => {
        const next = new Set(prev);
        for (const id of needingRefresh) next.add(id);
        return next;
      });

      // Merge rehydrated books into the library
      if (rehydrated.length > 0) {
        setBooks(prev => {
          const map = new Map<string, Audiobook>();
          for (const b of prev) map.set(b.id, b);
          for (const b of rehydrated) map.set(b.id, b);
          return Array.from(map.values());
        });

        // Load positions for rehydrated books
        const newPos: Record<string, number> = {};
        for (const b of rehydrated) {
          newPos[b.id] = await getPlaybackPosition(b.id).catch(() => 0);
        }
        setPositions(prev => ({ ...prev, ...newPos }));
      }

      // CRITICAL: Validate that all *stored* books have a valid rehydrated source.
      // If a book is in IDB but not in our 'rehydrated' list, it means we either:
      // A) Have no source for it (Drag & Drop without handle)
      // B) Have a source but it failed the check above
      // In either case, the Blob URL is dead, so it needs refresh.
      const allStoredBooks = await getAllAudiobooks();
      const rehydratedIds = new Set(rehydrated.map(b => b.id));

      for (const book of allStoredBooks) {
        if (!rehydratedIds.has(book.id)) {
          needingRefresh.add(book.id);
        }
      }

      setBooksNeedingRefresh(prev => {
        const next = new Set(prev);
        for (const id of needingRefresh) next.add(id);
        return next;
      });

    } catch (err) {
      console.error('Failed to rehydrate audiobooks:', err);
    }
  };

  // Auto-select the last played book when books are loaded
  // Auto-load last played book logic removed


  const loadBooks = async () => {
    const storedBooks = await getAllAudiobooks();
    // Merge stored books with any in-memory session books.
    // This is important on mobile where IndexedDB writes can fail (quota),
    // but we still want the user to see/play what they just imported.
    setBooks(prev => {
      const map = new Map<string, Audiobook>();
      for (const b of prev) map.set(b.id, b);
      for (const b of storedBooks) map.set(b.id, b);
      return Array.from(map.values());
    });

    // Load positions for all books
    const posMap: Record<string, number> = {};
    for (const book of storedBooks) {
      posMap[book.id] = await getPlaybackPosition(book.id);
    }
    setPositions(prev => ({ ...prev, ...posMap }));
  };

  const handleRemoveBook = (book: Audiobook) => {
    setRemoveBookTarget(book);
    setDeleteData(false); // Default to safely keeping data
  };

  const confirmRemove = async () => {
    if (!removeBookTarget) return;
    const book = removeBookTarget;

    // Optimistic update: Remove immediately from UI
    setBooks(prev => prev.filter(b => b.id !== book.id));
    setRemoveBookTarget(null);

    try {
      await deleteAudiobook(book.id);
      if (deleteData) {
        await deleteAudiobookState(book.id);
      }
      // Always remove the saved directory handle reference
      await removeAudiobookSource(book.id);
    } catch (e) {
      console.error('Remove failed', e);
      // Revert if failed (optional, but good practice. For now, we assume success or reload)
      await loadBooks();
    }
  };

  // Handle manual refresh for books that failed auto-reload
  const handleRefreshBook = async (bookId: string) => {
    try {
      const source = await getAudiobookSource(bookId);
      if (!source) {
        window.alert('No saved location for this audiobook. Please import it again.');
        return;
      }

      // Request permission to access the directory
      const permission = await (source.handle as any).requestPermission({ mode: 'read' });

      if (permission !== 'granted') {
        // Fallback layout
        const doImport = window.confirm('Permission denied. re-import the folder?');
        if (doImport) {
          fileInputRef.current?.click();
        }
        return;
      }

      // Get existing metadata
      const existingMetadata = books.find(b => b.id === bookId);

      // Rebuild the audiobook (force re-extraction of chapters)
      const refreshedBook = await rebuildAudiobookFromHandle(source, { ...existingMetadata, chapters: [] });

      // Update the book in the list
      setBooks(prev => {
        const map = new Map<string, Audiobook>();
        for (const b of prev) map.set(b.id, b);
        map.set(refreshedBook.id, refreshedBook);
        return Array.from(map.values());
      });

      // Remove from refresh-needed set
      setBooksNeedingRefresh(prev => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });

      // Update last accessed time
      await saveAudiobookSource(
        source.bookId,
        source.handle,
        source.filePath,
        source.folderName
      );
    } catch (err) {
      console.error('Failed to refresh audiobook:', err);
      // Fallback: prompt user to re-import locally (works on mobile/desktop without handle support)
      const doImport = window.confirm('Quick refresh unavailable. re-import the folder?');
      if (doImport) {
        fileInputRef.current?.click();
      }
    }
  };

  const triggerImport = async () => {
    // Prefer File System Access API for persistence (Desktop/Chrome)
    try {
      const anyWin = window as any;
      if (anyWin?.showDirectoryPicker) {
        const dirHandle = await anyWin.showDirectoryPicker();
        // Request persistent storage so handles survive browser cleanup
        await navigator?.storage?.persist?.();

        // Handle logic
        await processDirectoryHandle(dirHandle);
        return;
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('Directory handle not available or cancelled:', err);
      } else {
        // User cancelled picker
        return;
      }
    }

    // Fallback to legacy input (Mobile/Firefox)
    fileInputRef.current?.click();
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process flat file list
    await processFiles(Array.from(files));
  };

  const processDirectoryHandle = async (dirHandle: FileSystemDirectoryHandle) => {
    setIsImporting(true);
    try {
      // Recursively read files from the handle
      const files: File[] = [];

      const readEntries = async (handle: FileSystemDirectoryHandle, path: string) => {
        for await (const entry of (handle as any).values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            // Manually patch webkitRelativePath for logic downstream if needed
            Object.defineProperty(file, 'webkitRelativePath', {
              value: path ? `${path}/${file.name}` : file.name
            });
            files.push(file);
          } else if (entry.kind === 'directory') {
            await readEntries(entry as FileSystemDirectoryHandle, path ? `${path}/${entry.name}` : entry.name);
          }
        }
      };

      await readEntries(dirHandle, dirHandle.name);

      await processFiles(files, dirHandle);
    } catch (err) {
      console.error("Handle processing failed:", err);
      setIsImporting(false);
    }
  };

  // Common processing for both sources
  // dirHandle is optional (only present if we used the API)
  const processFiles = async (allFiles: File[], dirHandle?: FileSystemDirectoryHandle) => {
    if (allFiles.length === 0) {
      setIsImporting(false);
      return;
    }

    setIsImporting(true);

    try {
      // On some Android browsers, file.type can be empty for local media.
      // So we primarily rely on extension matching, with audio/* as a fallback.
      const isSupportedAudio = (f: File) => {
        const name = (f.name || '').trim();
        if (/\.(m4b|m4a|mp3|aac|mp4)$/i.test(name)) return true;
        const type = (f.type || '').toLowerCase();
        return type.startsWith('audio/');
      };

      const audioFiles = allFiles.filter(isSupportedAudio);

      if (audioFiles.length === 0) {
        // Provide actionable debug info. This will tell us whether the browser
        // returned zero files, unknown extensions, or 0-byte placeholders.
        const sample = allFiles.slice(0, 8).map(f => {
          const mb = (f.size / (1024 * 1024)).toFixed(1);
          const type = f.type || '(no type)';
          return `${f.name} | ${type} | ${mb}MB`;
        });
        window.alert(
          [
            `No supported audio files were detected.`,
            ``,
            `Files received from browser: ${allFiles.length}`,
            `Supported detected: ${audioFiles.length}`,
            ``,
            `Sample (name | type | size):`,
            ...sample,
            ``,
            `If sizes are 0MB or the list is empty, your mobile browser is not providing the files (often due to storage/permission or very large files).`,
            `Try selecting ONE .m4b/.m4a file (not a folder), or import on desktop.`,
          ].join('\n')
        );
        return;
      }

      // Create placeholder tiles immediately (ghost cards) so the UI feels alive.
      // We use getBookKey(file) so the placeholder matches the final stored book id.
      const placeholders: ImportItem[] = audioFiles.map((file) => {
        const baseTitle = file.name.replace(/\.[^/.]+$/, '');
        return {
          id: getBookKey(file),
          name: file.name,
          title: baseTitle,
          author: '',
          coverArt: undefined,
          status: 'pending',
          progress: 0,
        };
      });
      setImportItems(placeholders);

      const sessionBooks: Audiobook[] = [];
      const CONCURRENCY_LIMIT = 4;

      // Parallel processing helper
      const processFile = async (file: File) => {
        const id = getBookKey(file);
        try {
          // Mark as processing
          setImportItems(prev =>
            prev.map(it => it.id === id ? { ...it, status: 'processing', progress: 10 } : it)
          );

          type Extracted = Partial<Pick<Audiobook, 'title' | 'author' | 'narrator' | 'coverArt' | 'chapters'>>;
          const metadata: Extracted = await extractMetadata(file).catch((err) => {
            console.warn(`Metadata extraction error for ${file.name}`, err);
            return {} as Extracted;
          });

          // Update tile with whatever we learned
          setImportItems(prev =>
            prev.map(it => it.id === id ? {
              ...it,
              title: metadata.title || it.title,
              author: metadata.author || it.author,
              coverArt: metadata.coverArt || it.coverArt,
              progress: 70,
            } : it)
          );

          const relativePath = (file as any).webkitRelativePath || file.name;

          const book: Audiobook = {
            id,
            file,
            filePath: relativePath,
            title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
            author: metadata.author || 'Unknown Author',
            narrator: metadata.narrator,
            duration: 0,
            url: URL.createObjectURL(file),
            coverArt: metadata.coverArt,
            chapters: metadata.chapters || [{ title: "Start", startTime: 0 }]
          };

          sessionBooks.push(book);

          // Persistence
          try {
            await saveAudiobookMetadata(book);
            if (dirHandle && relativePath) {
              await saveAudiobookSource(id, dirHandle, relativePath, dirHandle.name);
            }
          } catch (err) {
            console.warn('Failed to persist audiobook metadata', err);
          }

          // Mark tile done
          setImportItems(prev =>
            prev.map(it => it.id === id ? { ...it, status: 'done', progress: 100 } : it)
          );

          // Clear "needs refresh" state if needed
          setBooksNeedingRefresh(prev => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });

          // Add to session books immediately for responsiveness
          setBooks(prev => {
            const map = new Map<string, Audiobook>();
            for (const b of prev) map.set(b.id, b);
            map.set(book.id, book);
            return Array.from(map.values());
          });
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
          setImportItems(prev =>
            prev.map(it => it.id === id ? { ...it, status: 'error', progress: 100 } : it)
          );
        }
      };

      // Run with concurrency limit
      const queue = [...audioFiles];
      const activepromises = new Set<Promise<void>>();

      while (queue.length > 0 || activepromises.size > 0) {
        if (queue.length > 0 && activepromises.size < CONCURRENCY_LIMIT) {
          const file = queue.shift()!;
          const promise = processFile(file).then(() => {
            activepromises.delete(promise);
          });
          activepromises.add(promise);
        } else {
          await Promise.race(activepromises);
        }
      }

      // Hydrate positions for newly added books.
      const newPos: Record<string, number> = {};
      for (const b of sessionBooks) {
        newPos[b.id] = await getPlaybackPosition(b.id).catch(() => 0);
      }
      setPositions(prev => ({ ...prev, ...newPos }));

      await loadBooks();
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      window.setTimeout(() => setImportItems([]), 1000);
    }
  };

  const calculateProgress = (book: Audiobook) => {
    const pos = positions[book.id] || 0;
    if (!book.duration) return 0;
    return (pos / book.duration) * 100;
  };

  const showImportGrid = isImporting && importItems.length > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items = Array.from(e.dataTransfer.items || []);
    const files: File[] = [];

    // Store potential handles to save later if possible
    // Map of filepath -> directory handle (root)
    type HandleInfo = { root: FileSystemDirectoryHandle, path: string };
    const validHandles = new Map<string, HandleInfo>();

    const readEntries = async (entry: any, path: string = '', rootHandle?: FileSystemDirectoryHandle) => {
      if (entry.isFile) {
        try {
          const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
          // Patch relative path
          const fullPath = path ? `${path}/${file.name}` : file.name;
          Object.defineProperty(file, 'webkitRelativePath', {
            value: fullPath
          });

          // If we have a root handle for this entry, track it for saving later
          if (rootHandle) {
            validHandles.set(fullPath, { root: rootHandle, path: fullPath });
          }
          files.push(file);
        } catch (err) {
          console.warn('Failed to read file entry', err);
        }
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readBatch = async () => {
          const batch = await new Promise<any[]>((resolve, reject) => reader.readEntries(resolve, reject));
          if (batch.length > 0) {
            for (const child of batch) {
              await readEntry(child, path ? `${path}/${entry.name}` : entry.name, rootHandle);
            }
            await readBatch(); // Continue reading until empty
          }
        };
        await readBatch();
      }
    };

    setIsImporting(true);

    try {
      for (const item of items) {
        // Try to get a handle first (modern API)
        let rootHandle: FileSystemDirectoryHandle | undefined;
        try {
          // @ts-ignore
          const handle = await item.getAsFileSystemHandle();
          if (handle && handle.kind === 'directory') {
            rootHandle = handle;
          }
        } catch (e) {
          // Fallback or ignore
        }

        const entry = item.webkitGetAsEntry();
        if (entry) {
          await readEntry(entry, '', rootHandle);
        }
      }

      if (files.length > 0) {
        let primaryHandle: FileSystemDirectoryHandle | undefined = undefined;
        const uniqueRoots = new Set(Array.from(validHandles.values()).map(v => v.root));
        if (uniqueRoots.size === 1) {
          primaryHandle = uniqueRoots.values().next().value;
        }
        await processFiles(files, primaryHandle);
      } else {
        setIsImporting(false);
      }
    } catch (err) {
      console.error("Drop failed", err);
      setIsImporting(false);
    }
  };

  return (
    <div
      className="flex flex-col space-y-8 p-6 animate-in fade-in duration-500 min-h-[50vh]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header removed as per request */}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleImportFiles}
        accept=".m4b,.m4a,.mp3,.aac,.mp4,audio/*"
        {...({ webkitdirectory: "", directory: "" } as any)}
      />

      {showImportGrid ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {importItems.map((it) => (
            <AudiobookTile
              key={it.id}
              title={it.title}
              author={it.author}
              coverArt={it.coverArt}
              importStatus={it.status}
              importProgress={it.progress}
            />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface/30 rounded-2xl border-2 border-dashed border-white/5 transition-colors hover:bg-surface/50 hover:border-white/10">
          <BookOpen size={64} className="text-textSub mb-4 opacity-20" />
          <h3 className="text-xl font-medium mb-2">No audiobooks found</h3>
          <p className="text-textSub mb-6 text-center max-w-xs">
            Drag & drop files here, or click below to import a folder.
          </p>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Choose Folder
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {books.map((book) => (
            <AudiobookTile
              key={book.id}
              title={book.title}
              author={book.author}
              coverArt={book.coverArt}
              progressPercent={calculateProgress(book)}
              onClick={() => onSelectBook(book)}
              onRemove={() => handleRemoveBook(book)}
              needsRefresh={booksNeedingRefresh.has(book.id)}
              onRefresh={() => handleRefreshBook(book.id)}
            />
          ))}
        </div>
      )}


      <ConfirmModal
        isOpen={!!removeBookTarget}
        title="Remove from Library?"
        message={`Are you sure you want to remove "${removeBookTarget?.title || 'this book'}"?`}
        confirmLabel="Remove"
        isDestructive={true}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveBookTarget(null)}
      >
        <div className="mt-4 flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
          <input
            type="checkbox"
            id="delete-data-checkbox"
            checked={deleteData}
            onChange={(e) => setDeleteData(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-white/20 bg-black/50 text-primary focus:ring-primary focus:ring-offset-0"
          />
          <label htmlFor="delete-data-checkbox" className="text-sm text-textSub cursor-pointer select-none">
            <span className="text-textMain font-medium block mb-0.5">Also delete listening history</span>
            Check this to remove bookmarks and playback progress. If unchecked, they will be restored if you import this book again.
          </label>
        </div>
      </ConfirmModal>
    </div>
  );
});
