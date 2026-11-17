// Hash routing: static hosting needs no rewrites and a book's own #anchors live inside its iframe, so they never collide.
import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => { addEventListener('hashchange', cb); return () => removeEventListener('hashchange', cb); };

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  const [path, qs = ''] = hash.replace(/^#\/?/, '').split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs) };
}

export const bookHref = (bookId: string, sectionId?: string) =>
  `#/book/${encodeURIComponent(bookId)}${sectionId ? '?s=' + encodeURIComponent(sectionId) : ''}`;
