import { useEffect, useRef, useState } from 'react';
import { dataChanged } from '../app/hooks';
import { getTheme, setTheme, type Theme } from '../app/theme';
import { notify } from '../app/toast';
import { InstallGuide } from '../components/InstallGuide';
import { storageErrorMessage } from '../db';
import { exportBackup, restoreBackup, validateBackup } from '../services/backup';
import { books } from '../services/catalog';
import { downloadBook, offlineSupported } from '../services/offline';

const fmt = (n: number) => (n > 1 << 20 ? `${(n / (1 << 20)).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export function SettingsPage() {
  const [theme, setT] = useState<Theme>(getTheme());
  const [estimate, setEstimate] = useState<StorageEstimate>();
  const [persisted, setPersisted] = useState<boolean>();
  const [backupError, setBackupError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const total = books.reduce((n, b) => n + b.sizeBytes, 0);

  const refreshStorage = () => {
    navigator.storage?.estimate?.().then(setEstimate).catch(() => undefined);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => undefined);
  };
  useEffect(refreshStorage, []);

  const onExport = async () => {
    try {
      const blob = new Blob([JSON.stringify(await exportBackup(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `devcodex-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { notify(storageErrorMessage(e), 'error'); }
  };

  const onImport = async (file: File) => {
    setBackupError(undefined);
    try {
      let data: unknown;
      try { data = JSON.parse(await file.text()); } catch { throw new Error('JSON 형식이 아닌 파일입니다.'); }
      await restoreBackup(validateBackup(data));
      setT(getTheme());
      dataChanged();
      notify('백업을 복원했습니다.');
    } catch (e) {
      setBackupError(`복원 실패: ${(e as Error).message}`);
    } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const downloadAll = async () => {
    if (!confirm(`전체 ${books.length}권(약 ${fmt(total)})을 이 기기에 저장합니다. 계속할까요?`)) return;
    let ok = 0;
    for (const b of books) {
      try { if ((await downloadBook(b.id)).status === 'saved') ok++; } catch { /* reported per book on the shelf */ }
    }
    notify(`${ok}/${books.length}권 저장 완료`, ok === books.length ? 'info' : 'error');
    refreshStorage();
  };

  return (
    <main className="page settings">
      <h1 className="section-title">설정</h1>

      <section className="panel">
        <h2>화면 테마</h2>
        <div className="chips" role="radiogroup" aria-label="화면 테마">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={theme === t} className="chip-btn" aria-pressed={theme === t} onClick={() => { setTheme(t); setT(t); }}>
              {{ system: '시스템', light: '라이트', dark: '다크' }[t]}
            </button>
          ))}
        </div>
        <p className="muted">앱 화면에만 적용됩니다. 각 족보집 문서는 원래 스타일(자체 다크모드 버튼 포함)을 그대로 사용합니다.</p>
      </section>

      <section className="panel">
        <h2>앱 설치</h2>
        <InstallGuide />
      </section>

      <section className="panel">
        <h2>오프라인 저장공간</h2>
        {offlineSupported() ? (
          <>
            <p>사용 중: {estimate?.usage != null ? fmt(estimate.usage) : '알 수 없음'} / 가용: {estimate?.quota != null ? fmt(estimate.quota) : '알 수 없음'}</p>
            <p className="muted">영구 저장: {persisted ? '허용됨' : '보장되지 않음 — 브라우저가 공간 부족 시 정리할 수 있습니다.'}</p>
            <button type="button" className="btn" onClick={downloadAll}>전체 오프라인 저장 ({fmt(total)})</button>
          </>
        ) : <p className="notice notice-err">이 환경에서는 오프라인 저장을 쓸 수 없습니다. HTTPS 주소(또는 localhost)로 접속하세요.</p>}
      </section>

      <section className="panel">
        <h2>백업 / 복원</h2>
        <p className="muted">북마크·읽기 기록·설정은 이 기기에만 저장됩니다. 앱 삭제나 브라우저 데이터 초기화 시 사라질 수 있으니 주기적으로 백업하세요.</p>
        <div className="row">
          <button type="button" className="btn" onClick={onExport}>JSON 내보내기</button>
          <label className="btn btn-ghost">
            JSON 가져오기
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" data-testid="backup-input"
              onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </label>
        </div>
        {backupError ? <p className="notice notice-err" role="alert">{backupError}</p> : null}
      </section>

      <section className="panel">
        <h2>정보</h2>
        <p className="muted">앱 버전 {__APP_VERSION__} · 책 {books.length}권</p>
      </section>
    </main>
  );
}
