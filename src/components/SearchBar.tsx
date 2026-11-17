import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { bookHref } from '../app/router';
import { books } from '../services/catalog';
import { loadIndex, search, type SearchResult } from '../services/search';

export function SearchBar() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      loadIndex()
        .then((idx) => alive && (setResults(search(q, books, idx)), setError(undefined)))
        .catch(() => alive && setError('검색 색인을 불러오지 못했습니다. 온라인 상태에서 앱을 한 번 열어 주세요.'));
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <section className="search" aria-label="통합 검색">
      <label className="search-box">
        <Search size={18} aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목·목차·본문 검색 (예: JWT, 트랜잭션)" aria-label="족보집 통합 검색" />
      </label>
      {error ? <p className="notice notice-err">{error}</p> : null}
      {results ? (
        results.length ? (
          <ol className="results" data-testid="search-results">
            {results.map((r, i) => (
              <li key={i}>
                <a href={bookHref(r.bookId, r.sectionId)}>
                  <span className="result-book">{r.bookTitle}</span>
                  <strong className="result-heading">{r.heading}</strong>
                  <span className="result-snippet">{r.snippet}</span>
                </a>
              </li>
            ))}
          </ol>
        ) : <p className="empty">'{q}'에 대한 검색 결과가 없습니다.</p>
      ) : null}
    </section>
  );
}
