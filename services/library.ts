import { get, getAll, put, remove, getAllKeys } from './db';

// Stable key used to associate play counts with a file across sessions
export function getTrackKey(file: File): string {
	return `${file.name}|${file.size}|${file.lastModified}`;
}

// Persist a directory handle (Chromium) so we can rehydrate the library later
export async function persistDirHandle(id: string, handle: any): Promise<void> {
	// Ask for persistent storage quota so handles survive browser cleanup
	try {
		await (navigator as any)?.storage?.persist?.();
	} catch {}
	await put('dirs', id, handle);
}

export async function loadSavedDirectories(): Promise<{ id: string; handle: any }[]> {
	const entries = await getAll('dirs');
	// entries is an array of handles keyed by whatever ids were used; IDs are not stored,
	// so we return generic incrementing ids.
	return (entries as any[]).map((h, i) => ({ id: `dir-${i}`, handle: h }));
}

// Recursively read all audio files from a directory handle
export async function readAllAudioFromHandle(dirHandle: any): Promise<File[]> {
	const files: File[] = [];
	if (!dirHandle || !dirHandle.values) return files;
	
	const audioExtensions = ['.mp3', '.m4a', '.m4b', '.aac', '.ogg', '.wav', '.flac'];
	
	// Iterate directory entries
	for await (const entry of dirHandle.values()) {
		try {
			if (entry.kind === 'file') {
				const file = await entry.getFile();
				const isAudioType = file && file.type && file.type.startsWith('audio/');
				const hasAudioExt = file && audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
				
				if (isAudioType || hasAudioExt) {
					files.push(file);
				}
			} else if (entry.kind === 'directory') {
				const nested = await readAllAudioFromHandle(entry);
				files.push(...nested);
			}
		} catch {
			// Skip unreadable entries
		}
	}
	return files;
}

export async function readPlayCount(trackKey: string): Promise<number> {
	const val = await get<number>('plays', trackKey);
	return typeof val === 'number' ? val : 0;
}

export async function writePlayCount(trackKey: string, count: number): Promise<void> {
	await put('plays', trackKey, count);
}

// Sources (playlistId -> folder handle + name)
export async function saveSource(playlistId: string, name: string, handle: any): Promise<void> {
	await put('sources', playlistId, { name, handle });
}

export async function getSource(playlistId: string): Promise<{ name: string; handle: any } | undefined> {
	return await get('sources', playlistId);
}

export async function getAllSources(): Promise<Record<string, { name: string; handle: any }>> {
	const values = await getAll('sources');
	const keys = await getAllKeys('sources');
	const map: Record<string, { name: string; handle: any }> = {};
	(keys as any[]).forEach((k, i) => {
		const v = (values as any[])[i];
		if (k != null && v) map[String(k)] = v;
	});
	return map;
}

export async function removeSource(playlistId: string): Promise<void> {
	await remove('sources', playlistId);
}

export async function pickDirectory(): Promise<any> {
	const anyWin = window as any;
	if (anyWin?.showDirectoryPicker) {
		try {
			return await anyWin.showDirectoryPicker();
		} catch {
			return null;
		}
	}
	return null;
}



