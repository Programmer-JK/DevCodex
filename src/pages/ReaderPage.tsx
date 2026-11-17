import { ArrowLeft, Bookmark as BookmarkIcon, BookmarkCheck, ChevronLeft, ChevronRight, ListTree, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { dataChanged, useBookmarks, useOfflineStatus, useOnline } from '../app/hooks';
import { notify } from '../app/toast';
import { OfflineBadge } from '../components/DownloadManager';
import { TocDrawer } from '../components/TocDrawer';
import { db, storageErrorMessage } from '../db';
import { appUrl, getBook } from '../services/catalog';
import type { Book, ReadingState, Section } from '../services/types';

const HEADINGS = 'h1,h2,h3,h4,h5,h6';
const SAVE_EVERY_MS = 800;

export function ReaderPage({ bookId, sectionId }: { bookId: string; sectionId?: string }) {
  const book = getBook(bookId);
  if (!book) return <ErrorScreen title="책을 찾을 수 없습니다" body={`'${bookId}'은(는) 서가에 없습니다. 카탈로그가 갱신되었을 수 있습니다.`} />;
  return <Reader key={book.id} book={book} sectionId={sectionId} />;
}

function Reader({ book, sectionId }: { book: Book; sectionId?: string }) {
  const online = useOnline();
  const status = useOfflineStatus(book.id);
  const bookmarks = useBookmarks();
  const frame = useRef<HTMLIFrameElement>(null);
  const [current, setCurrent] = useState<string | undefined>(sectionId);
  const [progress, setProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  const [limited, setLimited] = useState(false);
  const pending = useRef<ReadingState | null>(null);

  const flush = useCallback(() => {
    const s = pending.current;
    pending.current = null;
    if (s) db.put('reading', s).catch((e) => notify(storageErrorMessage(e), 'error'));
  }, []);

  // Record "opened" immediately; flush pending position on hide/unmount so progress isn't lost.
  useEffect(() => {
    db.get('reading', book.id)
      .then((prev) => db.put('reading', { ...prev, bookId: book.id, lastOpenedAt: new Date().toISOString() }))
      .then(dataChanged)
      .catch((e) => notify(storageErrorMessage(e), 'error'));
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', onHide); removeEventListener('pagehide', flush); flush(); };
  }, [book.id, flush]);

  const scrollTo = useCallback((s: Section) => {
    const doc = frame.current?.contentDocument;
    const el = doc && ((s.anchor && doc.getElementById(s.anchor)) || doc.querySelectorAll(HEADINGS)[s.order]);
    if (el) { el.scrollIntoView({ block: 'start' }); setCurrent(s.id); }
    else if (s.anchor && frame.current) frame.current.src = appUrl(book.entryUrl) + '#' + encodeURIComponent(s.anchor);
  }, [book.entryUrl]);

  const onLoad = useCallback(async () => {
    const f = frame.current;
    let doc: Document | null = null;
    try { doc = f?.contentDocument ?? null; } catch { /* cross-origin */ }
    const win = f?.contentWindow;
    if (!doc || !win) { setLimited(true); return; } // fallback: section-level navigation via URL only
    if (doc.documentElement.dataset.devcodexOffline) { setMissing(true); return; } // SW offline fallback page

    const headings = Array.from(doc.querySelectorAll(HEADINGS));
    const byOrder = new Map(book.sections.map((s) => [s.order, s]));
    const target = sectionId && book.sections.find((s) => s.id === sectionId);
    if (target) scrollTo(target);
    else {
      const saved = await db.get('reading', book.id).catch(() => undefined);
      if (saved?.scrollTop) win.scrollTo(0, saved.scrollTop);
      if (saved?.sectionId) setCurrent(saved.sectionId);
    }

    let last = 0;
    let timer: number | undefined;
    const record = () => {
      const max = doc.documentElement.scrollHeight - win.innerHeight;
      const pct = max > 0 ? Math.min(100, Math.round((win.scrollY / max) * 100)) : 100;
      let sec: Section | undefined;
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top > 80) break;
        sec = byOrder.get(i) ?? sec;
      }
      setProgress(pct);
      if (sec) setCurrent(sec.id);
      pending.current = { bookId: book.id, sectionId: sec?.id, scrollTop: Math.round(win.scrollY), progressPercent: pct, lastOpenedAt: new Date().toISOString() };
    };
    win.addEventListener('scroll', () => {
      record();
      const now = Date.now();
      clearTimeout(timer);
      if (now - last > SAVE_EVERY_MS) { last = now; flush(); } else timer = window.setTimeout(flush, SAVE_EVERY_MS);
    }, { passive: true });
    win.addEventListener('pagehide', flush);
  }, [book, sectionId, scrollTo, flush]);

  const closeToc = useCallback(() => setTocOpen(false), []);
  const idx = book.sections.findIndex((s) => s.id === current);
  const bookmark = bookmarks.find((b) => b.bookId === book.id && b.sectionId === (current ?? undefined));

  const toggleBookmark = async () => {
    try {
      if (bookmark) await db.delete('bookmarks', bookmark.id);
      else {
        const sec = book.sections[idx];
        await db.put('bookmarks', { id: crypto.randomUUID(), bookId: book.id, sectionId: sec?.id, label: sec?.heading ?? book.title, createdAt: new Date().toISOString() });
      }
      dataChanged();
      notify(bookmark ? '북마크를 삭제했습니다.' : '북마크에 추가했습니다.');
    } catch (e) { notify(storageErrorMessage(e), 'error'); }
  };

  if (!online && status && status.status !== 'saved' || missing)
    return (
      <ErrorScreen
        icon={<WifiOff size={32} aria-hidden />}
        title="오프라인에서 열 수 없는 책입니다"
        body={`'${book.title}'은(는) 이 기기에 저장되어 있지 않습니다. 인터넷에 연결한 뒤 서가에서 '오프라인 저장'을 누르면 이후 네트워크 없이 읽을 수 있습니다.`}
      />
    );

  return (
    <div className="reader">
      <header className="reader-head">
        <a className="icon-btn" href="#/" aria-label="서가로 돌아가기"><ArrowLeft size={20} aria-hidden /></a>
        <h1 className="reader-title">{book.title}</h1>
        <button type="button" className="icon-btn" onClick={toggleBookmark} aria-pressed={!!bookmark} aria-label={bookmark ? '북마크 삭제' : '현재 위치 북마크'}>
          {bookmark ? <BookmarkCheck size={20} aria-hidden /> : <BookmarkIcon size={20} aria-hidden />}
        </button>
        <button type="button" className="icon-btn" onClick={() => setTocOpen(true)} aria-label="목차 열기" aria-haspopup="dialog"><ListTree size={20} aria-hidden /></button>
      </header>
      {limited ? <p className="notice">이 문서는 읽기 위치 자동 저장을 지원하지 않습니다. 섹션 단위로만 이동합니다.</p> : null}
      <iframe
        ref={frame}
        className="reader-frame"
        title={book.title}
        src={appUrl(book.entryUrl)}
        onLoad={onLoad}
        allow="clipboard-write"
        // Untrusted books render without scripts; trusted (own) books run their original JS.
        sandbox={book.trusted ? undefined : 'allow-same-origin allow-popups'}
      />
      <footer className="reader-foot">
        <button type="button" className="icon-btn" disabled={idx <= 0} onClick={() => scrollTo(book.sections[idx - 1])} aria-label="이전 섹션"><ChevronLeft size={20} aria-hidden /></button>
        <div className="reader-progress">
          <div className="bar" aria-hidden><span style={{ width: `${progress}%` }} /></div>
          <span data-testid="progress">{progress}%</span>
          <OfflineBadge book={book} />
        </div>
        <button type="button" className="icon-btn" disabled={idx >= book.sections.length - 1} onClick={() => scrollTo(book.sections[idx + 1])} aria-label="다음 섹션"><ChevronRight size={20} aria-hidden /></button>
      </footer>
      <TocDrawer open={tocOpen} sections={book.sections} current={current} onClose={closeToc} onSelect={(s) => { setTocOpen(false); scrollTo(s); }} />
    </div>
  );
}

function ErrorScreen({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return (
    <main className="page error-screen" role="alert">
      {icon}
      <h1>{title}</h1>
      <p>{body}</p>
      <a className="btn" href="#/">서가로 돌아가기</a>
    </main>
  );
}
