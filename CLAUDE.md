# Claude Code 작업 가이드 — DevCodex

1. 프로젝트 시작 전 `DevCodex_PRD_Claude_Code.md`를 끝까지 읽는다. 해당 문서를 구현 기준(Source of Truth)으로 사용한다.
2. 실제 HTML 문서를 `incoming/` 또는 `source-books/`에서 조사한다. 원본을 변경하거나 삭제하지 않는다.
3. 단순 화면 목업이 아닌, 실제 배포 가능한 React + TypeScript + Vite PWA를 만든다.
4. 모바일 버튼의 동작, 브라우저 보안 정책, HTTPS 오프라인 동작을 실제 테스트한다.
5. HTML이 주어지지 않았다면 샘플은 샘플로 표시하고, 사용자가 기존 HTML을 추가하는 import 명령을 만든다.
6. Vercel와 PWA manifest/service worker 스코프를 검증한다.
7. 타입 검사, 빌드, E2E 테스트 후 검증 근거와 미해결 제한을 보고한다.

## 첫 작업

`DevCodex_PRD_Claude_Code.md`의 0절과 18절을 참조하고 Phase 0의 파일 인벤토리부터 시작한다.
