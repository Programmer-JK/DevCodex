/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { BOOKS_CACHE } from './services/offline-constants';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const booksPath = new URL('books/', self.registration.scope).pathname;

// Books: cache-first from the per-book cache the app fills explicitly; never auto-cached on read.
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith(booksPath),
  async ({ request }) => {
    const cached = await (await caches.open(BOOKS_CACHE)).match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch {
      if (request.mode === 'navigate') return (await matchPrecache('offline.html')) ?? Response.error();
      return Response.error();
    }
  },
);

// App shell: any other navigation inside scope gets index.html (hash routing handles the rest).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [new RegExp('^' + booksPath)] }));

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
