import { describe, expect, it } from 'vitest';
import { search } from '../../src/services/search';
import catalog from '../../src/generated/catalog.json';
import index from '../../src/generated/search-index.json';
import type { Book, SearchEntry } from '../../src/services/types';

const books = catalog.books as Book[];
const idx = index as SearchEntry[];

describe('search over the generated index', () => {
  it('finds real headings from imported HTML', () => {
    const r = search('JWT', books, idx);
    expect(r[0]).toMatchObject({ bookId: 'sample-spring', heading: 'JWT 인증 흐름' });
  });
  it('matches body text and ranks heading hits first', () => {
    const r = search('트랜잭션', books, idx);
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r[0].heading).toContain('트랜잭션');
  });
  it('requires all tokens and ignores case', () => {
    expect(search('jwt 서명', books, idx).length).toBe(1);
    expect(search('jwt 존재하지않는단어', books, idx)).toEqual([]);
  });
  it('returns nothing for empty queries', () => {
    expect(search('   ', books, idx)).toEqual([]);
  });
});
