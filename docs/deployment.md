# Deployment — Vercel

## 최초 설정

1. GitHub에 저장소 푸시 → Vercel *Add New Project* → 저장소 선택.
2. Framework Preset: **Vite** (또는 Other). 설정은 [vercel.json](../vercel.json)이 지정: `buildCommand: npm run build`, `outputDirectory: dist`.
3. Deploy. 이후 `main` 푸시마다 자동 배포, PR마다 Preview URL.

CLI로 할 경우: `npx vercel` (프리뷰) / `npx vercel --prod`.

`vercel.json`이 지정하는 헤더:
- `/sw.js`: `Cache-Control: no-cache` — 새 버전 감지가 늦어지지 않도록.
- `/assets/*`: 1년 immutable (파일명에 해시 포함).
- `/books/*`: `no-cache` — 업데이트된 책이 HTTP 캐시에 묶이지 않도록(오프라인 사본은 SW 캐시가 담당).
- `/manifest.webmanifest`: `application/manifest+json`.

라우팅은 해시 기반이라 rewrite 설정이 필요 없습니다.

## 서브패스 / 커스텀 도메인

- Vercel 기본 도메인·커스텀 도메인 모두 루트(`/`) 배포 → 추가 설정 없음.
- 다른 앱 아래 서브패스로 둘 경우 `BASE_PATH=/devcodex/ npm run build`. manifest `id/start_url/scope`, SW scope, 책 URL이 모두 따라갑니다.

## 새 책 반영 절차

`incoming/`에 HTML 추가 → `npm run books:import` → audit 확인 → `npm run build && npm run preview`로 확인 → 커밋·푸시 → Vercel 배포 → 앱에서 *업데이트 준비 완료* → *지금 적용*. 이미 저장한 책은 `contentVersion`이 바뀌면 카드에 *업데이트 가능* → *업데이트 받기*.

## 배포 후 검증 (Chrome DevTools)

1. Application → **Manifest**: 오류 없음, 아이콘 3종 표시, Installability 경고 없음.
2. Application → **Service Workers**: `sw.js` activated, scope가 배포 루트.
3. Application → **Cache Storage**: `workbox-precache-v2-…`(앱 셸), 책 저장 후 `devcodex-books-v1`에 해당 책 파일.
4. Network → **Offline** 체크 → 새로고침: 서가·검색·저장한 책 열림, 미저장 책은 안내 화면.
5. 휴대폰 실기기: [mobile-test-checklist.md](mobile-test-checklist.md).
