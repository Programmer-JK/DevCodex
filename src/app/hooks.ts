import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { db } from '../db';
import { getBookStatus, subscribeOffline } from '../services/offline';
import type { Bookmark, OfflineBookState, ReadingState } from '../services/types';

export function useOnline() {
  return useSyncExternalStore(
    (cb) => { addEventListener('online', cb); addEventListener('offline', cb); return () => { removeEventListener('online', cb); removeEventListener('offline', cb); }; },
    () => navigator.onLine,
  );
}

export function useOfflineStatus(bookId: string) {
  const [state, setState] = useState<OfflineBookState>();
  useEffect(() => {
    let alive = true;
    const refresh = () => getBookStatus(bookId).then((s) => alive && setState(s)).catch(() => undefined);
    refresh();
    const off = subscribeOffline(refresh);
    return () => { alive = false; off(); };
  }, [bookId]);
  return state;
}

// Simple cross-component refresh for IndexedDB-backed lists.
const dataListeners = new Set<() => void>();
export const dataChanged = () => dataListeners.forEach((l) => l());

function useDbList<T>(load: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const refresh = useCallback(() => { load().then(setItems).catch(() => setItems([])); }, [load]);
  useEffect(() => { refresh(); dataListeners.add(refresh); return () => { dataListeners.delete(refresh); }; }, [refresh]);
  return items;
}

const loadBookmarks = () => db.getAll('bookmarks').then((b: Bookmark[]) => b.sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
const loadReading = () => db.getAll('reading').then((r: ReadingState[]) => r.sort((x, y) => y.lastOpenedAt.localeCompare(x.lastOpenedAt)));
export const useBookmarks = () => useDbList(loadBookmarks);
export const useReading = () => useDbList(loadReading);
