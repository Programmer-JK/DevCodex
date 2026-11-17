import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { notify } from '../app/toast';

/** Never reloads on its own: a legacy document may hold unsaved state. */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({
    onRegisterError: (e) => console.warn('Service worker registration failed', e),
  });
  useEffect(() => {
    if (offlineReady) { notify('앱 화면이 오프라인용으로 저장되었습니다.'); setOfflineReady(false); }
  }, [offlineReady, setOfflineReady]);
  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>업데이트 준비 완료</span>
      <button type="button" className="btn" onClick={() => updateServiceWorker(true)}>지금 적용</button>
      <button type="button" className="btn btn-ghost" onClick={() => setNeedRefresh(false)}>나중에</button>
    </div>
  );
}
