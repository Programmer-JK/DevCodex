import { bookHref } from '../app/router';
import { CATEGORY_LABEL } from '../services/catalog';
import type { Book, ReadingState } from '../services/types';
import { DownloadManager, OfflineBadge } from './DownloadManager';

export function BookCard({ book, reading }: { book: Book; reading?: ReadingState }) {
  return (
    <article className="card" data-testid="book-card">
      <a className="card-link" href={bookHref(book.id)}>
        <div className="card-meta">
          <span className="chip">{CATEGORY_LABEL[book.category]}</span>
          {book.sample ? <span className="chip chip-sample">SAMPLE</span> : null}
          <OfflineBadge book={book} />
        </div>
        <h3 className="card-title">{book.title}</h3>
        {book.description ? <p className="card-desc">{book.description}</p> : null}
        <p className="card-foot">
          목차 {book.sections.length}개
          {reading ? ` · 최근 열람 ${new Date(reading.lastOpenedAt).toLocaleDateString('ko-KR')}` : ''}
          {reading?.progressPercent != null ? ` · ${reading.progressPercent}%` : ''}
        </p>
      </a>
      <DownloadManager book={book} />
    </article>
  );
}
