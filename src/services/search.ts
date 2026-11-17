import type { Book, SearchEntry } from './types';

export interface SearchResult {
  bookId: string;
  bookTitle: string;
  sectionId?: string;
  heading: string;
  snippet: string;
  score: number;
}

let indexPromise: Promise<SearchEntry[]> | undefined;
/** Lazy-loaded chunk; precached by the service worker so search works offline. */
export const loadIndex = () =>
  (indexPromise ??= import('../generated/search-index.json').then((m) => m.default as SearchEntry[]));

function snippetAround(text: string, token: string, radius = 50): string {
  const i = text.toLowerCase().indexOf(token);
  if (i < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, i - radius);
  return (start > 0 ? '…' : '') + text.slice(start, i + token.length + radius) + (i + token.length + radius < text.length ? '…' : '');
}

/** All tokens must match somewhere in book title + heading + text. Title/heading hits rank higher. */
export function search(query: string, books: Book[], index: SearchEntry[], limit = 50): SearchResult[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const byId = new Map(books.map((b) => [b.id, b]));
  const results: SearchResult[] = [];
  for (const e of index) {
    const book = byId.get(e.bookId);
    if (!book) continue;
    const title = book.title.toLowerCase();
    const heading = e.heading.toLowerCase();
    const text = e.textSnippet.toLowerCase();
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const s = (heading.includes(t) ? 20 + (7 - e.rankHint) : 0) + (title.includes(t) ? 10 : 0) + (text.includes(t) ? 5 : 0);
      if (!s) { ok = false; break; }
      score += s;
    }
    if (!ok) continue;
    const textToken = tokens.find((t) => text.includes(t));
    results.push({
      bookId: e.bookId, bookTitle: book.title, sectionId: e.sectionId, heading: e.heading, score,
      snippet: textToken ? snippetAround(e.textSnippet, textToken) : e.textSnippet.slice(0, 100),
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
