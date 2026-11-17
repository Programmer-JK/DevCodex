import { useState } from 'react';
import { bookHref } from '../app/router';
import { useReading } from '../app/hooks';
import { BookCard } from '../components/BookCard';
import { SearchBar } from '../components/SearchBar';
import { books, CATEGORY_LABEL, getBook } from '../services/catalog';
import type { Category } from '../services/types';

export function LibraryPage() {
  const reading = useReading();
  const [cat, setCat] = useState<Category | 'all'>('all');
  const recent = reading.map((r) => ({ r, b: getBook(r.bookId) })).filter((x) => x.b).slice(0, 3);
  const cats = (Object.keys(CATEGORY_LABEL) as Category[]).filter((c) => books.some((b) => b.category === c));
  const shown = cat === 'all' ? books : books.filter((b) => b.category === cat);
  const readingById = new Map(reading.map((r) => [r.bookId, r]));

  return (
    <main className="page">
      <SearchBar />
      {books.some((b) => b.sample) ? (
        <p className="notice">현재 서가에는 <strong>기능 검증용 SAMPLE 문서</strong>만 있습니다. 실제 족보집은 <code>incoming/</code>에 넣고 <code>npm run books:import</code>로 추가하세요.</p>
      ) : null}
      {recent.length ? (
        <section aria-labelledby="recent-h">
          <h2 id="recent-h" className="section-title">이어 읽기</h2>
          <ul className="recent">
            {recent.map(({ r, b }) => (
              <li key={r.bookId}>
                <a href={bookHref(r.bookId)} className="recent-item">
                  <span>{b!.title}</span>
                  <small>{b!.sections.find((s) => s.id === r.sectionId)?.heading ?? '처음부터'}{r.progressPercent != null ? ` · ${r.progressPercent}%` : ''}</small>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="shelf-h">
        <h2 id="shelf-h" className="section-title">내 서가 <small>{books.length}권</small></h2>
        {cats.length > 1 ? (
          <div className="chips" role="group" aria-label="카테고리 필터">
            {(['all', ...cats] as const).map((c) => (
              <button key={c} type="button" className="chip-btn" aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c === 'all' ? '전체' : CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        ) : null}
        {shown.length ? (
          <div className="grid">{shown.map((b) => <BookCard key={b.id} book={b} reading={readingById.get(b.id)} />)}</div>
        ) : (
          <p className="empty">서가가 비어 있습니다. <code>incoming/</code>에 HTML을 넣고 <code>npm run books:import</code>를 실행하세요.</p>
        )}
      </section>
    </main>
  );
}
