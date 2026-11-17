# DevCodex — 모바일·오프라인 개발 족보집 PWA

직접 만든 개발 학습용 HTML 족보집을 **원본 그대로** 모아, 휴대폰 홈 화면 앱으로 실행하고 오프라인에서도 읽는 정적 PWA입니다.
React + TypeScript + Vite + vite-plugin-pwa(injectManifest) + IndexedDB. 서버·DB 없음. 배포 대상: **Vercel**.

> 현재 서가의 3권은 모두 **기능 검증용 SAMPLE**(`samples/`)입니다. 실제 족보집을 `incoming/`에 넣으면 샘플은 자동으로 빠집니다.

## 명령

```bash
npm install
npm run dev            # 개발 서버 (서비스 워커는 dev에서 동작하지 않음)
npm run books:import   # incoming/ → public/books/ 복사 + 카탈로그·검색 색인·audit 생성
npm run build          # import + 타입 검사 + 프로덕션 빌드 (dist/)
npm run preview        # 프로덕션 빌드 확인 (http://localhost:4173, SW 동작)
npm run test           # Vitest 단위 + Playwright E2E (E2E는 build+preview를 자동 실행)
```

Playwright 브라우저가 없다면 최초 1회 `npx playwright install chromium`.

## 기존 HTML 추가하기

1. `incoming/`(또는 `source-books/`)에 넣습니다.
   - 단일 파일: `incoming/spring-guide.html` (+ 상대 경로로 참조하는 `css/js/이미지`는 같은 폴더 기준 그대로)
   - 폴더형: `incoming/frontend-handbook/index.html` + 같은 폴더의 자산 (폴더 전체가 복사됨)
2. `npm run books:import`
3. 콘솔 출력과 [docs/legacy-audit.md](docs/legacy-audit.md)에서 누락 자산, 외부 CDN, `file://`, 고정 폭 등 경고를 확인합니다.
4. 제목·분류·설명은 [books.meta.json](books.meta.json)에서 고칩니다(처음 import 때 자동 생성, 이후 사용자 값 유지).
   `category`: `frontend` | `java-spring` | `database` | `other`. 출처를 믿을 수 없는 문서는 `"trusted": false` → 스크립트 없이 렌더링.
5. `npm run build && npm run preview`로 확인 → 커밋·푸시 → Vercel이 배포 → 사용자는 앱의 **업데이트 준비 완료** 배너로 새 버전 적용, 저장한 책에는 **업데이트 가능** 표시.

원본 파일은 읽기만 하며 수정·삭제하지 않습니다. 복사본에도 경로 자동 보정은 하지 않습니다 — 웹에서 안 되는 참조는 audit에 표시되니 원본을 고친 뒤 다시 import 하세요.

> ⚠️ Vercel에 배포한 HTML은 URL을 아는 누구나 볼 수 있습니다. 회사 내부 자료 등 비공개 문서는 올리지 마세요(필요하면 Vercel Deployment Protection 등 별도 접근 제어).

## 휴대폰 설치·오프라인 사용

- **Android Chrome:** HTTPS 배포 주소 접속 → 설정 탭의 *홈 화면에 설치* 또는 메뉴 → *앱 설치*.
- **iOS Safari:** 공유 → *홈 화면에 추가*. 설치된 앱 안에서 다시 오프라인 저장하세요(Safari와 저장소가 분리될 수 있음).
- **오프라인 저장:** 온라인일 때 서가 카드의 *오프라인 저장* → 모든 파일을 Cache Storage에 넣고 다시 확인한 뒤에만 *오프라인 저장됨* 표시. 일부 실패 시 *일부 저장 n/m* + 실패 파일 목록.
- 앱 화면·카탈로그·검색 색인은 첫 온라인 방문 때 자동 저장됩니다. 책 본문은 직접 저장한 책만 오프라인으로 열립니다.
- 북마크·읽기 위치는 기기 로컬(IndexedDB)에만 있습니다. 설정 → *JSON 내보내기*로 백업하세요.

## 문서

- [docs/architecture.md](docs/architecture.md) — 구조, 라우팅·캐시·iframe 결정 근거
- [docs/deployment.md](docs/deployment.md) — Vercel 배포, DevTools 검증법
- [docs/mobile-test-checklist.md](docs/mobile-test-checklist.md) — 실기기 수동 검증 체크리스트
- [docs/legacy-audit.md](docs/legacy-audit.md) — import 시 자동 생성되는 호환성 점검표
