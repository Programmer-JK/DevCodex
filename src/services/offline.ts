import { db, storageErrorMessage } from '../db';
import { appUrl, books, getBook } from './catalog';
import { BOOKS_CACHE } from './offline-constants';
import type { OfflineBookState } from './types';

type Progress = (completed: number, total: number) => void;

const inflight = new Map<string, { promise: Promise<OfflineBookState>; controller: AbortController; progress: [number, number] }>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const subscribeOffline = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const offlineSupported = () => 'caches' in window && 'serviceWorker' in navigator;
export const getProgress = (bookId: string) => inflight.get(bookId)?.progress;

/** Truth comes from Cache Storage; IndexedDB only remembers version and last error. */
export async function verifyBook(bookId: string): Promise<OfflineBookState> {
  const book = getBook(bookId);
  if (!book) throw new Error(`알 수 없는 책: ${bookId}`);
  const total = book.assets.length;
  const stored = await db.get('offline', bookId).catch(() => undefined);
  if (!offlineSupported()) return { bookId, status: 'not-saved', totalAssetCount: total, error: '이 브라우저/연결에서는 오프라인 저장을 쓸 수 없습니다 (HTTPS 필요).' };
  const cache = await caches.open(BOOKS_CACHE);
  let count = 0;
  for (const a of book.assets) if (await cache.match(appUrl(a))) count++;
  const status: OfflineBookState['status'] =
    count === total ? 'saved' : count > 0 ? 'partial' : stored?.status === 'failed' ? 'failed' : 'not-saved';
  return {
    bookId, status, cachedAssetCount: count, totalAssetCount: total,
    cachedVersion: count ? stored?.cachedVersion : undefined, verifiedAt: new Date().toISOString(), error: stored?.error,
  };
}

export async function getBookStatus(bookId: string): Promise<OfflineBookState> {
  const job = inflight.get(bookId);
  if (job) return { bookId, status: 'downloading', cachedAssetCount: job.progress[0], totalAssetCount: job.progress[1] };
  return verifyBook(bookId);
}

export const needsUpdate = (s: OfflineBookState | undefined, contentVersion: string) =>
  s?.status === 'saved' && s.cachedVersion !== contentVersion;

/**
 * Downloads every asset first; only writes to the cache when all succeeded, so a failed
 * update keeps the previous working version. With no previous version, partial results are kept and shown as 'partial'.
 */
export function downloadBook(bookId: string, onProgress?: Progress): Promise<OfflineBookState> {
  const existing = inflight.get(bookId);
  if (existing) return existing.promise;
  const book = getBook(bookId);
  if (!book) return Promise.reject(new Error(`알 수 없는 책: ${bookId}`));
  if (!offlineSupported()) return Promise.reject(new Error('이 브라우저/연결에서는 오프라인 저장을 쓸 수 없습니다 (HTTPS 필요).'));

  const controller = new AbortController();
  const job = { controller, progress: [0, book.assets.length] as [number, number], promise: undefined as unknown as Promise<OfflineBookState> };
  inflight.set(bookId, job);
  emit();

  job.promise = (async () => {
    navigator.storage?.persist?.().catch(() => undefined); // best effort; success is never assumed
    const fetched: [string, Response][] = [];
    const failed: string[] = [];
    for (const asset of book.assets) {
      const url = appUrl(asset);
      try {
        const res = await fetch(url, { cache: 'no-cache', signal: controller.signal });
        if (res.ok) fetched.push([url, res]); else failed.push(`${asset} (${res.status})`);
      } catch (e) {
        if (controller.signal.aborted) break;
        failed.push(`${asset} (${(e as Error).name})`);
      }
      job.progress = [fetched.length + failed.length, book.assets.length];
      onProgress?.(...job.progress);
      emit();
    }

    const prev = await verifyBook(bookId);
    if (controller.signal.aborted) return prev;
    const cache = await caches.open(BOOKS_CACHE);
    let error: string | undefined;
    try {
      if (!failed.length) {
        for (const [url, res] of fetched) await cache.put(url, res);
        const keep = new Set(book.assets.map(appUrl));
        const prefix = appUrl(`books/${bookId}/`);
        for (const req of await cache.keys()) if (req.url.startsWith(prefix) && !keep.has(req.url)) await cache.delete(req);
      } else if (prev.status !== 'saved') {
        for (const [url, res] of fetched) await cache.put(url, res);
        error = `일부 파일을 받지 못했습니다: ${failed.join(', ')}`;
      } else {
        error = `업데이트 실패, 이전 버전을 유지합니다: ${failed.join(', ')}`;
      }
    } catch (e) {
      error = storageErrorMessage(e);
    }
    const ok = !failed.length && !error;
    await db.put('offline', {
      bookId, status: ok ? 'saved' : 'failed', error,
      cachedVersion: ok ? book.contentVersion : prev.cachedVersion,
    }).catch(() => undefined);
    const final = await verifyBook(bookId);
    if (!ok && !final.error) final.error = error;
    return final;
  })().finally(() => { inflight.delete(bookId); emit(); });
  return job.promise;
}

export function cancelDownload(bookId: string) {
  inflight.get(bookId)?.controller.abort();
}

/** Removes only this book's cached files; bookmarks and reading progress are kept. */
export async function removeBook(bookId: string) {
  const cache = await caches.open(BOOKS_CACHE);
  const prefix = appUrl(`books/${bookId}/`);
  for (const req of await cache.keys()) if (req.url.startsWith(prefix)) await cache.delete(req);
  await db.delete('offline', bookId).catch(() => undefined);
  emit();
}

/** Book ids whose saved copy differs from the current catalog version. */
export async function checkForUpdates(): Promise<string[]> {
  const out: string[] = [];
  for (const b of books) if (needsUpdate(await getBookStatus(b.id), b.contentVersion)) out.push(b.id);
  return out;
}
