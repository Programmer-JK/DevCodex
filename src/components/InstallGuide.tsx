import { isIOS, isStandalone, promptInstall, useInstallPrompt } from '../pwa/install';

export function InstallGuide() {
  const prompt = useInstallPrompt();
  if (isStandalone()) return <p>설치된 앱으로 실행 중입니다.</p>;
  return (
    <div className="install">
      {prompt ? <button type="button" className="btn" onClick={promptInstall}>홈 화면에 설치</button> : null}
      {isIOS() ? (
        <ol>
          <li>Safari에서 이 페이지를 엽니다 (다른 브라우저는 iOS 버전에 따라 지원이 다름).</li>
          <li>하단의 <strong>공유</strong> 버튼 → <strong>홈 화면에 추가</strong>를 누릅니다.</li>
          <li>설치한 앱을 열고 <strong>앱 안에서</strong> 오프라인 저장을 다시 하세요. iOS는 Safari와 홈 화면 앱의 저장소가 분리될 수 있습니다.</li>
        </ol>
      ) : (
        <ul>
          <li><strong>Android Chrome:</strong> 위 설치 버튼 또는 메뉴(⋮) → <strong>앱 설치/홈 화면에 추가</strong>.</li>
          <li><strong>데스크톱 Chrome/Edge:</strong> 주소창 오른쪽의 설치 아이콘.</li>
          {!prompt ? <li>설치 버튼이 보이지 않으면 이미 설치되었거나, 브라우저가 설치 조건(HTTPS·재방문)을 아직 판단하지 않은 상태입니다.</li> : null}
        </ul>
      )}
      <p className="muted">설치 직후 바로 오프라인이 되지 않습니다. 온라인 상태에서 앱을 한 번 열고, 읽을 책을 '오프라인 저장'하세요.</p>
    </div>
  );
}
