import { Trash2 } from 'lucide-react';
import { bookHref } from '../app/router';
import { dataChanged, useBookmarks } from '../app/hooks';
import { notify } from '../app/toast';
import { db, storageErrorMessage } from '../db';
import { getBook } from '../services/catalog';

export function BookmarksPage() {
  const bookmarks = useBookmarks();
  const remove = (id: string) => db.delete('bookmarks', id).then(dataChanged).catch((e) => notify(storageErrorMessage(e), 'error'));
  return (
    <main className="page">
      <h1 className="section-title">북마크</h1>
      {bookmarks.length ? (
        <ul className="list" data-testid="bookmark-list">
          {bookmarks.map((b) => {
            const book = getBook(b.bookId);
            return (
              <li key={b.id} className="list-item">
                <a href={bookHref(b.bookId, b.sectionId)}>
                  <strong>{b.label ?? '책 처음'}</strong>
                  <small>{book?.title ?? `${b.bookId} (서가에서 삭제됨)`} · {new Date(b.createdAt).toLocaleString('ko-KR')}</small>
                </a>
                <button type="button" className="icon-btn" onClick={() => remove(b.id)} aria-label={`북마크 삭제: ${b.label ?? ''}`}><Trash2 size={18} aria-hidden /></button>
              </li>
            );
          })}
        </ul>
      ) : <p className="empty">아직 북마크가 없습니다. 책을 읽다가 상단의 북마크 버튼을 누르세요.</p>}
    </main>
  );
}
