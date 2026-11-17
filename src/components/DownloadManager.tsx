import { AlertTriangle, Check, Download, RefreshCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { notify } from '../app/toast';
import { useOfflineStatus } from '../app/hooks';
import { cancelDownload, downloadBook, needsUpdate, removeBook } from '../services/offline';
import type { Book } from '../services/types';

export function OfflineBadge({ book }: { book: Book }) {
  const s = useOfflineStatus(book.id);
  if (!s) return null;
  if (s.status === 'downloading') return <span className="badge">저장 중 {s.cachedAssetCount}/{s.totalAssetCount}</span>;
  if (needsUpdate(s, book.contentVersion)) return <span className="badge badge-warn">업데이트 가능</span>;
  if (s.status === 'saved') return <span className="badge badge-ok" data-testid="offline-saved"><Check size={14} aria-hidden /> 오프라인 저장됨</span>;
  if (s.status === 'partial') return <span className="badge badge-warn">일부 저장 {s.cachedAssetCount}/{s.totalAssetCount}</span>;
  if (s.status === 'failed') return <span className="badge badge-err">저장 실패</span>;
  return null;
}

export function DownloadManager({ book }: { book: Book }) {
  const s = useOfflineStatus(book.id);
  const [busy, setBusy] = useState(false);
  if (!s) return null;

  const download = async () => {
    setBusy(true);
    try {
      const r = await downloadBook(book.id);
      if (r.status === 'saved') notify(`'${book.title}' 오프라인 저장 완료 (${r.cachedAssetCount}개 파일 확인)`);
      else notify(r.error ?? `저장 미완료: ${r.cachedAssetCount}/${r.totalAssetCount}`, 'error');
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally { setBusy(false); }
  };
  const remove = async () => {
    try { await removeBook(book.id); notify('오프라인 사본을 삭제했습니다. 북마크와 진행률은 유지됩니다.'); }
    catch (e) { notify((e as Error).message, 'error'); }
  };

  if (s.status === 'downloading')
    return (
      <div className="dl-row">
        <progress max={s.totalAssetCount} value={s.cachedAssetCount} aria-label="다운로드 진행률" />
        <button type="button" className="btn btn-ghost" onClick={() => cancelDownload(book.id)}><X size={16} aria-hidden /> 취소</button>
      </div>
    );

  const update = needsUpdate(s, book.contentVersion);
  return (
    <div className="dl-row">
      {s.status !== 'saved' || update ? (
        <button type="button" className="btn" disabled={busy} onClick={download}>
          {update ? <RefreshCw size={16} aria-hidden /> : <Download size={16} aria-hidden />}
          {update ? '업데이트 받기' : s.status === 'partial' || s.status === 'failed' ? '다시 저장' : '오프라인 저장'}
        </button>
      ) : null}
      {s.status === 'saved' || s.status === 'partial' ? (
        <button type="button" className="btn btn-ghost" onClick={remove} aria-label={`${book.title} 오프라인 사본 삭제`}>
          <Trash2 size={16} aria-hidden /> 삭제
        </button>
      ) : null}
      {s.error && s.status !== 'saved' ? <p className="dl-error"><AlertTriangle size={14} aria-hidden /> {s.error}</p> : null}
    </div>
  );
}
