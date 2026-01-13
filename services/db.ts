// Minimal IndexedDB helper utilities for the app.
// Creates `vibe-db` with object stores:
// - dirs: persisted directory handles
// - plays: track play counts keyed by a stable track key
// - audiobook_sources: directory handles for audiobooks
// - preferences: app-level user preferences

const DB_NAME = 'vibe-db';
const DB_VERSION = 4;

export async function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('dirs')) {
				db.createObjectStore('dirs');
			}
			if (!db.objectStoreNames.contains('plays')) {
				db.createObjectStore('plays');
			}
			if (!db.objectStoreNames.contains('sources')) {
				db.createObjectStore('sources');
			}
			if (!db.objectStoreNames.contains('audiobooks')) {
				db.createObjectStore('audiobooks');
			}
			if (!db.objectStoreNames.contains('audiobook_positions')) {
				db.createObjectStore('audiobook_positions');
			}
			if (!db.objectStoreNames.contains('bookmarks')) {
				db.createObjectStore('bookmarks');
			}
			if (!db.objectStoreNames.contains('audiobook_sources')) {
				db.createObjectStore('audiobook_sources');
			}
			if (!db.objectStoreNames.contains('preferences')) {
				db.createObjectStore('preferences');
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function withStore<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => void): Promise<T> {
	const db = await openDb();
	return new Promise<T>((resolve, reject) => {
		const tx = db.transaction(store, mode);
		const st = tx.objectStore(store);
		let result: any;
		op(st);
		tx.oncomplete = () => resolve(result);
		tx.onerror = () => reject(tx.error);
		// Allow operation to set result via callback return
		(tx as any)._setResult = (v: any) => (result = v);
	});
}

export async function put(store: string, key: IDBValidKey, value: any): Promise<void> {
	const db = await openDb();
	return new Promise<void>((resolve, reject) => {
		const tx = db.transaction(store, 'readwrite');
		const st = tx.objectStore(store);
		st.put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function get<T = any>(store: string, key: IDBValidKey): Promise<T | undefined> {
	const db = await openDb();
	return new Promise<T | undefined>((resolve, reject) => {
		const tx = db.transaction(store, 'readonly');
		const st = tx.objectStore(store);
		const req = st.get(key);
		req.onsuccess = () => resolve(req.result as T | undefined);
		req.onerror = () => reject(req.error);
	});
}

export async function getAll<T = any>(store: string): Promise<T[]> {
	const db = await openDb();
	return new Promise<T[]>((resolve, reject) => {
		const tx = db.transaction(store, 'readonly');
		const st = tx.objectStore(store);
		const req = st.getAll();
		req.onsuccess = () => resolve(req.result as T[]);
		req.onerror = () => reject(req.error);
	});
}

export async function getAllKeys(store: string): Promise<IDBValidKey[]> {
	const db = await openDb();
	return new Promise<IDBValidKey[]>((resolve, reject) => {
		const tx = db.transaction(store, 'readonly');
		const st = tx.objectStore(store);
		const req = st.getAllKeys();
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function remove(store: string, key: IDBValidKey): Promise<void> {
	const db = await openDb();
	return new Promise<void>((resolve, reject) => {
		const tx = db.transaction(store, 'readwrite');
		const st = tx.objectStore(store);
		st.delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}



