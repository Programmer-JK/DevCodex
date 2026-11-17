// Minimal IndexedDB wrapper. Bump DB_VERSION and add a migration step in onupgradeneeded for schema changes.
import type { Bookmark, OfflineBookState, ReadingState } from '../services/types';

const DB_NAME = 'devcodex';
const DB_VERSION = 1;

type Stores = { reading: ReadingState; bookmarks: Bookmark; offline: OfflineBookState };
type StoreName = keyof Stores;

let dbPromise: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (e.oldVersion < 1) {
        db.createObjectStore('reading', { keyPath: 'bookId' });
        db.createObjectStore('bookmarks', { keyPath: 'id' });
        db.createObjectStore('offline', { keyPath: 'bookId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = undefined; reject(req.error); };
  });
  return dbPromise;
}

async function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? req.result : (undefined as T));
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
  });
}

export const db = {
  get: <S extends StoreName>(s: S, key: string) => run<Stores[S] | undefined>(s, 'readonly', (o) => o.get(key)),
  getAll: <S extends StoreName>(s: S) => run<Stores[S][]>(s, 'readonly', (o) => o.getAll()),
  put: <S extends StoreName>(s: S, value: Stores[S]) => run<IDBValidKey>(s, 'readwrite', (o) => o.put(value)),
  delete: (s: StoreName, key: string) => run<undefined>(s, 'readwrite', (o) => o.delete(key)),
  replaceAll: <S extends StoreName>(s: S, values: Stores[S][]) =>
    run<undefined>(s, 'readwrite', (o) => { o.clear(); values.forEach((v) => o.put(v)); }),
};

/** Human-readable message for storage failures (quota, private mode, etc.). */
export function storageErrorMessage(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === 'QuotaExceededError') return '저장공간이 부족합니다. 오프라인 저장한 책을 삭제하거나 기기 공간을 확보하세요.';
  return `기기에 저장하지 못했습니다 (${name ?? String(e)}). 개인정보 보호 모드에서는 저장이 제한될 수 있습니다.`;
}
