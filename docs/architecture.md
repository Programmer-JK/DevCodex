# Architecture

```
incoming/ source-books/ (원본, 읽기 전용)   samples/ (SAMPLE, 사용자 책이 없을 때만)
        └── scripts/import-books.mjs
              ├─ public/books/<slug>/…          원본 바이트 그대로 복사 (+ 추적된 상대 자산)
              ├─ src/generated/catalog.json      Book[] (assets, sections, contentVersion=sha256 12자)
              ├─ src/generated/search-index.json 섹션 단위 텍스트 (lazy chunk, precache)
              ├─ books.meta.json                 사용자 편집용 제목/분류/trusted
              └─ docs/legacy-audit.md            §6.3 호환성 점검

브라우저
  React 앱 셸 ─ HashRouter(자체 18줄) ─ 서가/검색/북마크/설정/리더
  리더: 동일 출처 <iframe src="books/<slug>/…"> — 원본 JS 그대로 실행
  IndexedDB devcodex v1: reading / bookmarks / offline
  Service Worker (src/sw.ts, injectManifest)
    ├─ precache: 앱 셸, 아이콘, manifest, 검색 색인, offline.html (books/ 제외)
    ├─ books/*: devcodex-books-v1 캐시 우선 → 네트워크 → (탐색 요청이면) offline.html
    └─ 그 외 탐색: index.html
```

## 결정과 근거

| 결정 | 근거 |
|---|---|
| **해시 라우팅** (`#/book/<id>?s=<section>`) | 정적 호스팅에 rewrite 불필요, 서브패스 무관. 책 내부 `#anchor`는 iframe 문서 안에서만 동작하므로 충돌 없음. 라우터 라이브러리 대신 `useSyncExternalStore` 18줄. |
| **동일 출처 iframe** | 원본 HTML/CSS/JS를 변환 없이 실행, 앱 CSS와 격리. 동일 출처라 스크롤 위치·헤딩 위치를 읽어 진행률/섹션 이동 가능. |
| **trusted 플래그** | 동일 출처 + 스크립트 = 앱 저장소 접근 가능. 본인 문서만 `trusted:true`(기본). `false`면 `sandbox="allow-same-origin allow-popups"`(스크립트 차단). |
| **섹션 위치 = 헤딩 순번** | 앵커 없는 헤딩에 id를 주입하지 않고(원본 DOM 무수정), 원본 DOM의 `h1~h6` 순번을 저장해 `querySelectorAll()[order].scrollIntoView()`. 앵커가 있으면 앵커 우선. |
| **injectManifest + 수동 Cache Storage** | 책은 사용자가 고른 것만 저장하고, 상태(저장/일부/실패/업데이트)를 정확히 제어해야 함. 읽기만 해도 자동 캐시되는 런타임 캐시를 쓰지 않음. |
| **저장 = 전부 받은 뒤 쓰기** | 모든 자산을 메모리로 받은 뒤 성공 시에만 캐시에 기록 → 업데이트 실패 시 이전 정상 버전 유지. 이전 버전이 없을 때만 부분 저장. 상태 판정은 매번 Cache Storage를 다시 조회. |
| **검색: 자체 토큰 AND 검색** | 한국어에 퍼지 검색 이득이 적고 색인이 작음(샘플 4.6KB). 색인이 커지면 책별 분할 lazy load로 전환. |
| **IndexedDB 직접 사용** | 저장소 3개, 단순 key-value. Dexie 불필요. 스키마 변경은 `DB_VERSION` + `onupgradeneeded`의 `oldVersion` 분기. |
| **업데이트 = prompt** | 새 SW는 대기하고 배너로 알림. 열린 문서 상태를 보호하려고 강제 새로고침하지 않음. |

## PRD 대비 변경

- 배포 대상: GitHub Pages → **Vercel**(사용자 결정). `base`는 `/`, `BASE_PATH` 환경변수로 서브패스 빌드도 지원(`/devcodex/`에서 검증).
- `build-search-index.mjs`를 별도로 두지 않고 importer가 카탈로그와 색인을 함께 생성(같은 파싱 결과 재사용).
