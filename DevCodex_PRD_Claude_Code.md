# DevCodex — 모바일·오프라인 개발 족보집 PWA

> Claude Code 구현용 제품 기획서(PRD) + 기술 설계서 + 검수 기준  
> 버전: 1.0 · 작성일: 2026-11-17 · 상태: 구현 지시 가능

---

## 0. Claude Code를 위한 최우선 지시

이 문서는 **실제로 동작하는 프로젝트를 구현하기 위한 작업 명세**다. 단순 목업, 화면 시안, TODO 목록만 만들지 않는다.

1. 시작 시 현재 작업 디렉터리와 `source-books/`, `incoming/`의 실제 HTML 및 연관 자산 파일을 먼저 조사한다. 기존 파일이 있다면 **원본을 수정하거나 삭제하지 않는다**.
2. 구현 전 실제 파일의 구조, 인라인 JavaScript, 외부 CSS/JS, 이미지·폰트, `fetch()`, `file://` 의존성, 모바일 뷰포트, 버튼 이벤트를 분석하고 발견 사항을 `docs/legacy-audit.md`에 기록한다.
3. 사용자 제공 콘텐츠가 없으면 **가짜 족보집 내용을 실제 자료인 것처럼 생성하지 않는다**. 기능 확인용 예제 1~2개를 `sample`로 명시하여 만든 뒤, 실제 HTML을 추가하기만 하면 작동하도록 구축한다.
4. **프론트엔드 React + TypeScript + Vite, 백엔드 없는 정적 PWA**를 기본 선택으로 한다. 기술 선택에 중대한 제약이 있다면 근거를 기록하고 대체안을 제시한다.
5. 다음 요구사항을 실제 동작으로 검증한다: (a) 모바일 설치, (b) 오프라인 재열람, (c) HTML 내부 버튼, (d) 검색, (e) 북마크/진행률, (f) 배포 후 경로.
6. 개발서버에서 작동한다는 이유만으로 PWA 성공을 선언하지 않는다. **프로덕션 빌드 + HTTPS 배포 환경**에서 서비스 워커와 캐시를 테스트한다.
7. 각 단계가 끝나면 변경 파일, 실행한 명령, 테스트 결과, 미해결 항목을 간단히 보고한다. 외부 계정 로그인/배포 권한이 없으면 배포를 완료한 척하지 않는다.

## 1. 배경 및 해결할 문제

### 1.1 현재 문제

- Java/Spring, Frontend, Oracle SQL 등 여러 개발 학습용 HTML 족보집이 각각 별도 파일로 존재한다.
- 휴대폰의 파일 앱에서 `.html`을 직접 열면, 파일 미리보기/WebView 제약 또는 브라우저의 로컬 파일 보안 정책 때문에 일부 버튼이나 JavaScript 기능이 작동하지 않는다.
- 문서가 분산되어 검색, 읽던 위치 복원, 모바일 독서, 오프라인 관리가 불편하다.

### 1.2 제품 목표

**기존 HTML 문서를 최대한 원형 그대로 통합하고, 휴대폰 홈 화면에서 앱처럼 실행하며, 필요한 자료를 다운로드해 인터넷이 없어도 학습할 수 있는 개인 지식 라이브러리**를 만든다.

### 1.3 핵심 원칙

- **기존 자료 보존 우선:** 직접 만든 HTML의 콘텐츠, 스타일, 동작을 가능한 한 유지한다.
- **실제 동작 우선:** 겉모습보다 터치·스크롤·검색·복사·오프라인 기능의 신뢰성을 우선한다.
- **Mobile first:** 작은 화면에서 먼저 설계하고 데스크톱으로 확장한다.
- **Local first:** 개인의 북마크·메모·설정은 기본적으로 기기 로컬에 저장한다.
- **저비용:** MVP는 서버·데이터베이스·유료 API 없이 정적 호스팅으로 운영한다.
- **점진적 변환:** 기존 HTML을 한꺼번에 Markdown/React로 바꾸지 않는다.

## 2. 사용자 및 주요 시나리오

주 사용자는 개발 실무와 이직 면접 준비를 병행하며 모바일 이동 중에도 학습하는 개발자다.

**시나리오 A — 기존 HTML 업로드:** 개발자가 PC의 `incoming/`에 `spring-guide.html`을 넣고 `npm run books:import` 실행 → 제목·목차·검색용 텍스트 추출 → 서가에 새 책 추가 → 기존 문서의 기능 최대한 보존.

**시나리오 B — 모바일 설치:** HTTPS 주소에 방문 → 설치 안내 확인 → Android Chrome 또는 iOS Safari에서 홈 화면에 추가 → 독립 실행형 앱 화면으로 실행.

**시나리오 C — 오프라인 공부:** 와이파이 연결 중 특정 책의 '오프라인 저장' 완료 확인 → 비행기 모드 전환 → 앱 실행, 책 열기, 목차 이동, 코드 복사, 이전 위치 복원.

**시나리오 D — 통합 검색:** 'JWT', '트랜잭션', '브라우저 렌더링' 검색 → 제목/목차/내용 기준 결과 표시 → 결과 클릭 시 해당 족보집과 섹션으로 이동.

**시나리오 E — 학습 흔적:** 책을 읽다가 북마크하거나 메모 → 앱을 종료하고 다시 열어도 로컬 기록 복원 → JSON 백업 및 복원 가능.

## 3. 범위 및 우선순위

### P0 — 반드시 완성할 MVP

| ID | 기능 | 완료 조건 |
|---|---|---|
| P0-01 | 홈/서가 | 등록된 모든 책의 제목, 분류, 설명, 최근 열람 표시 |
| P0-02 | 레거시 HTML 가져오기 | 원본 HTML 및 로컬 연관 자산을 포함해 가져오기; 충돌/누락 리포트 |
| P0-03 | 읽기 뷰 | 기존 HTML 내용·버튼 표시, 터치 조작, 내부 링크/스크롤 지원 |
| P0-04 | 모바일 반응형 | 320~430px 너비와 태블릿/PC에서 레이아웃 파손 없음 |
| P0-05 | 다크/라이트 모드 | 앱 UI 테마 변경·유지; 원본 문서 테마는 호환 가능할 때만 연계 |
| P0-06 | 서가 통합 검색 | 저장된 책의 제목·헤딩·텍스트 검색, 오프라인 가능 |
| P0-07 | 최근 열람 및 이어 읽기 | 마지막 책/섹션/대략적 스크롤 위치 복원 |
| P0-08 | 북마크 | 책/섹션 북마크 추가·삭제, 앱 재시작 후 유지 |
| P0-09 | PWA 설치 | 유효한 manifest, 아이콘, 독립 실행형 지원, iOS 안내 |
| P0-10 | 오프라인 저장 | 책별 다운로드/삭제/상태표시; 콘텐츠+의존 자산 검증 |
| P0-11 | 앱 셸 오프라인 | 최초 온라인 로딩 뒤 네트워크 없어도 홈/서가 진입 가능 |
| P0-12 | 오류 안내 | 자료 누락, 오프라인 미저장, 복사 권한 실패, 저장공간 부족 안내 |
| P0-13 | 백업/복구 | 북마크, 메모(추후 도입 시), 진행률, 설정 JSON 내보내기/가져오기 |
| P0-14 | 배포/문서 | GitHub Pages 정적 배포 절차, 설정, 검사 명령, 설치 가이드 |

### P1 — MVP 직후

- 책 내 본문 검색 및 검색어 강조, 검색 결과 섹션 바로가기 정확도 개선.
- 학습 메모, 태그, 즐겨찾기 서가, 완료/복습 상태.
- 코드 블록 복사 UX 개선, 섹션별 학습 시간 및 체크리스트.
- 자동 콘텐츠 업데이트 확인 + 변경 내용 표시.
- 사용자 정의 카테고리·정렬·필터.

### P2 — 장기 검토(이번 구현 범위 제외)

- 계정/클라우드 동기화, 여러 기기 간 자동 동기화.
- AI 질의응답, RAG 검색, 오프라인 LLM.
- 실시간 문서 공동 편집, 별도 백엔드/DB.
- 모바일에서 폴더 전체를 자유롭게 감시하는 기능(브라우저 보안 정책상 일반적인 자동 접근 불가).

## 4. 정보 구조 및 UX

### 4.1 주요 화면

```text
앱 시작
└─ 홈 / 내 서가
   ├─ 전체 족보집
   ├─ 카테고리 (Frontend / Java & Spring / SQL & Oracle / 기타)
   ├─ 통합 검색
   ├─ 최근 읽은 책
   ├─ 오프라인 저장 목록
   └─ 설정 / 설치 도움말 / 백업

책 선택
└─ 리더
   ├─ 상단: 뒤로가기, 책 제목, 검색, 북마크, 더보기
   ├─ 측면/바텀시트: 목차
   ├─ 본문: 기존 HTML 렌더링
   └─ 하단: 읽기 진행, 이전/다음 섹션, 오프라인 상태
```

### 4.2 모바일 UI 요구

- 모바일 1열 카드 목록, PC에서는 적절한 그리드.
- 본문 기본 글자 크기 16px 이상 권장, 조절 범위 약 14~22px. 앱 셸의 설정을 iframe 내부 문서에 강제로 적용하지 않으며, 호환성 확인 후 선택적으로 적용.
- 주요 터치 타깃 약 44×44 CSS px 이상, 버튼 간 충분한 간격.
- 모바일 목차는 슬라이드 패널 또는 바텀시트; Escape/뒤로가기/바깥 클릭으로 닫기.
- 상단 고정 헤더는 읽기 몰입을 방해하지 않도록 축소 가능. 화면 안전 영역(`env(safe-area-inset-*)`) 고려.
- 스크롤 위치 유지, 긴 코드 블록의 수평 스크롤, 넓은 표의 overflow 처리.
- 색 대비/키보드 포커스/스크린리더 레이블 및 `prefers-reduced-motion` 지원.
- 미학 방향: 읽기 중심의 절제된 인터페이스, 과도한 모션·3D·배경 효과 금지.

### 4.3 화면 상태

- 로딩, 빈 서가, 검색 결과 없음, 다운로드 중(진행률), 저장 완료, 일부 누락, 업데이트 가능, 저장공간 부족, 오프라인 미다운로드 상태를 별도 UX로 정의.
- 설치 가능 여부와 브라우저별 설치 안내를 구분. iOS에서 존재하지 않는 설치 이벤트를 기다리지 말고 수동 안내 제공.

## 5. 기술 아키텍처

### 5.1 기본 기술 스택

| 레이어 | 선정 | 이유 |
|---|---|---|
| 앱 | React + TypeScript + Vite | 개발 효율, 정적 배포, UI 재사용 |
| UI | CSS variables + 경량 컴포넌트, Lucide icons 선택 | 과도한 UI 의존성 최소화 |
| PWA | `vite-plugin-pwa` + Workbox | manifest, SW, precache, 런타임 캐시 |
| 로컬 데이터 | IndexedDB (`Dexie` 선택 가능) | 북마크·진행률·메모를 구조화하여 저장 |
| 작은 설정 | localStorage (선택) | 테마 등 소규모 설정만 보관 |
| 검색 | 빌드 시 HTML 텍스트 추출 + Fuse.js(또는 경량 검색) | 오프라인 검색 지원 |
| HTML 분석 | Node.js 빌드 스크립트 + `cheerio`/`parse5` | 원본 변환 없이 메타데이터 추출 |
| 테스트 | Vitest + Playwright | 단위 및 실제 브라우저 동작 검증 |
| 호스팅 | GitHub Pages 우선 | 무료 HTTPS 정적 배포 |

**주의:** 라이브러리 버전은 구현 당시 상호 호환되는 안정 버전을 선택하고 잠금 파일을 커밋한다.

### 5.2 구조도

```text
사용자 브라우저 / 홈 화면에 설치한 PWA
  │
  ├─ React 앱 셸 (서가, 검색, 설정, 북마크)
  ├─ HTML 리더 (동일 출처의 별도 문서 / iframe)
  ├─ IndexedDB (개인 학습 상태)
  └─ Service Worker
      ├─ 앱 셸 precache
      └─ 선택한 책 HTML 및 연결 자산 Cache Storage

GitHub Pages (HTTPS 정적 호스팅)
  ├─ index.html / 빌드 자산 / manifest / service worker
  ├─ catalog.json / search-index.json
  └─ books/<slug>/index.html + 연관 CSS/JS/이미지

개발자 로컬 PC
  └─ incoming/*.html 및 연관 폴더
      └─ import-books 스크립트
           ├─ public/books/<slug>/...
           ├─ catalog.json 갱신
           └─ 검색 인덱스 생성
```

### 5.3 경로 정책

- 배포 경로가 `https://username.github.io/devcodex/` 같은 **서브패스**일 수 있으므로 모든 앱 자원 URL은 Vite `base`/`import.meta.env.BASE_URL`을 기준으로 생성한다.
- `/books/...`처럼 사이트 루트에 고정된 절대 경로를 사용하지 않는다.
- service worker의 등록 URL·scope, `start_url`, `id`, `manifest` 경로, React 라우팅 fallback까지 서브패스를 테스트한다.
- 정적 호스팅 호환성을 위해 기본적으로 hash router 또는 명시적 정적 경로 전략을 사용한다. 라우터 선택 근거를 작성한다.

## 6. 기존 HTML 문서 통합 설계 — 가장 중요한 구현 구간

### 6.1 가져오기 입력/출력

개발자가 다음처럼 파일을 넣는 것을 기본 경로로 한다.

```text
incoming/
├─ spring-guide.html
├─ frontend-handbook/
│  ├─ index.html
│  ├─ style.css
│  ├─ script.js
│  └─ images/...
└─ oracle-sql.html
```

`npm run books:import`를 실행하면 가져온 각 책을 `public/books/<slug>/`의 독립 폴더로 복제/정리하고 `src/generated/catalog.json` 및 검색 인덱스를 생성한다. 실제 책 제목, 목차, 본문은 **입력 HTML에서 추출**한다. 제목이 없으면 파일명 기반 임시 제목으로 표시하고 사용자 수정 가능한 메타데이터 파일에 기록한다.

### 6.2 원본 보존·동작 정책

- 가져오기 전에 HTML 파일을 그대로 읽고 상대 경로의 CSS/JS/이미지를 추적한다.
- 원본 백업/입력 파일을 절대 덮어쓰지 않는다.
- 안전하게 필요하고 확인 가능한 경로 보정만 복사본에 적용한다. 어떤 수정을 했는지 리포트에 기록한다.
- HTML 자체에 있는 버튼(탭/아코디언/목차/다크모드/코드 복사 등)은 **기본적으로 원래 JavaScript가 실행되는 리더 모드**를 사용한다.
- 구현 우선순위는 **동일 출처의 독립 HTML 문서 iframe 렌더링**. 부모 앱과 레거시 문서는 분리되며, `iframe`의 높이·스크롤·내부 앵커·뒤로가기 동작을 검증한다.
- 원본 문서가 부모 창에 의존하거나 `file://` 전용 동작, 외부 CDN, 특수 보안 권한을 요구한다면 해당 기능은 **별도 호환성 수정 작업**으로 분류한다. PWA 전환만으로 모든 버튼이 자동 복구된다고 가정하지 않는다.
- CSS가 모바일에 맞지 않는 HTML은 '원본 보기'를 유지하면서, 선택적으로 **읽기 최적화 뷰**(스타일 보정/정적 텍스트 뷰)를 제공할 수 있다. 최적화 뷰가 원본 인터랙션을 숨기거나 망가뜨릴 경우 경고한다.
- 레거시 HTML의 JS가 악성 또는 출처 불명인 경우 실행 금지. 신뢰할 수 없는 사용자 HTML을 동일 출처에서 `allow-scripts`+`allow-same-origin` 조합으로 실행하지 않는다. MVP에서 스크립트 실행은 본인 소유/검토 완료 문서로 제한한다.

### 6.3 호환성 사전 점검

가져오기 시 아래 검사를 실시하고 각 책별 결과를 기록한다.

| 점검 | 결과 예시 | 처리 |
|---|---|---|
| 인라인 스크립트 | 있음 | 테스트 필요 표시 |
| 외부 CDN JS/CSS | 있음 | 라이선스/의존성 검토 후 로컬 번들 가능 여부 판단 |
| `fetch()`/ES modules | 있음 | HTTPS 경로 및 CORS 재검증 |
| `window.open`/부모 창 의존 | 있음 | 탭/팝업 동작 검증 |
| 로컬 이미지 상대 경로 | 있음 | 복사본에서 경로 확인 |
| `file://` 절대 참조 | 있음 | 명시적 오류 및 치환 요청 |
| 고정 폭 레이아웃 | 있음 | 모바일 overflow/뷰포트 검증 |
| 코드 복사 API | 있음 | HTTPS에서 Clipboard API 권한/포커스 검증 |

### 6.4 검색 인덱싱

- 빌드 시 HTML의 `title`, `h1`~`h6`, 주요 본문 텍스트를 추출한다. `script`, `style`, nav 및 장식 텍스트는 검색 대상에서 제외한다.
- 결과는 `bookId`, `sectionId`, `heading`, `textSnippet`, `rankHint`, `sourceUrl` 구조로 저장한다.
- 앵커가 없는 섹션은 추출 과정에서 안정적인 인덱스 ID를 생성하되, **원본 DOM 이동을 무리하게 시도하지 않는다**. 정확한 섹션 이동이 불가능한 자료는 '책 열기' fallback을 사용한다.
- 검색은 모든 책을 사전에 다운로드하지 않아도 **검색 인덱스만 준비되면** 제목/목차 검색이 가능하도록 한다. 본문 검색용 인덱스가 클 경우 압축 또는 분할 인덱싱을 적용한다.
- 오프라인 검색을 지원하려면 해당 검색 인덱스 자체가 캐시되어 있어야 한다.

## 7. PWA·오프라인 설계

### 7.1 필수 앱 메타데이터

- `manifest.webmanifest`: `name`, `short_name`, `id`, `start_url`, `scope`, `display: standalone`, `theme_color`, `background_color`, `icons`(192/512 PNG 및 maskable 지원), 목적에 맞는 설명.
- `<meta name="viewport" content="width=device-width, initial-scale=1">`, `apple-touch-icon`, iOS 홈 화면 호환 메타 정보.
- 아이콘 파일은 실제로 생성·배치하고 요청 시 200 응답을 확인한다. 빈 경로나 텍스트만으로 아이콘을 대체하지 않는다.

### 7.2 저장 정책

**App Shell 캐시**
- 홈 화면 HTML, 번들 JS/CSS, 필수 폰트/아이콘, 기본 카탈로그/검색 데이터, 오프라인 fallback 페이지를 설치/초기 실행 단계에서 캐시한다.
- 앱 셸은 최초 온라인 접속이 정상 완료되면 오프라인 재실행할 수 있어야 한다.

**Books 캐시**
- 책별 오프라인 저장 버튼을 제공한다. 책 선택 시 HTML 문서와 **실제로 필요한** CSS/JS/이미지/폰트 등 같은 출처 자원을 함께 다운로드한다.
- 등록된 의존 자산 목록(`assets`)으로 누락 여부를 검증하고, 모두 성공해야 '저장 완료'로 표시한다. 실패 시 '일부 저장' 또는 '실패'를 노출한다.
- `download all`은 저장공간 안내 후 사용자 명시 액션으로만 실행한다.
- 삭제 버튼은 특정 책의 오프라인 캐시만 지우며 북마크·진행률은 지우지 않는다.

**저장 전략**
- 앱 번들: precache 및 버전 갱신.
- HTML/책 자산: 사용자가 선택하여 prefetch(다운로드)하고 캐시 우선(Cache First)으로 오프라인 열람. 갱신 시 온라인 상태 확인/버전 비교.
- 검색용 catalog/index: 빌드 포함 또는 캐시된 버전 확보; 최초 오프라인 부팅 시 사용 가능.
- 개인 상태: IndexedDB.
- 상시 인터넷이 필요한 외부 API·CDN은 오프라인 완료 조건에 포함하지 않는다. 가능하면 자산을 로컬화한다.

### 7.3 업데이트 정책

- SW가 새 버전을 발견하면 사용자에게 '업데이트 준비 완료' 안내.
- 열어 둔 원본 문서에서 작성 중인 메모/현재 상태가 있을 수 있으므로 강제 새로고침 금지.
- 책의 개정 버전은 검증 후 캐시를 교체한다. 실패 시 이전에 정상 사용 가능한 버전을 유지할 수 있도록 설계한다.
- 각 책의 `contentVersion` 또는 콘텐츠 해시를 기록해 업데이트 여부를 판단한다.

### 7.4 플랫폼 제약 및 예외

- **서비스 워커는 `file://`로 실행되지 않는다.** 개발은 `localhost`, 배포는 HTTPS에서 확인한다.
- iOS는 Android처럼 공통 설치 팝업이 뜨지 않을 수 있으므로 **Safari → 공유 → 홈 화면에 추가** 안내를 제공한다.
- iOS Safari 브라우저와 홈 화면 앱의 저장소가 분리될 수 있으므로 **설치한 앱 안에서 오프라인 다운로드와 학습 상태 저장을 다시 확인**하도록 안내한다.
- 브라우저 저장 공간은 기기와 정책에 따라 제한·정리될 수 있어 **영구 보존을 보장하지 않는다**. 저장 용량 추정(`navigator.storage.estimate`)과 가능한 경우 영구 저장 요청(`navigator.storage.persist`)을 활용하되 성공을 가정하지 않는다.
- Wi-Fi 없이 설치 직후 오프라인이 되는 것은 아니다. 반드시 첫 온라인 접속과 자료 다운로드/검증이 필요하다.
- 모바일에서 로컬 파일 선택을 제공하더라도 전체 폴더에 무제한 접근·자동 동기화는 약속하지 않는다.

## 8. 데이터 모델

```ts
interface Book {
  id: string;                 // stable slug
  title: string;
  description?: string;
  category: 'frontend' | 'java-spring' | 'database' | 'other';
  tags: string[];
  entryUrl: string;            // 배포 base URL 기준 상대 경로
  assets: string[];           // 오프라인에 포함할 실제 의존 자산
  sections: Section[];
  contentVersion: string;      // 콘텐츠 해시 또는 명시적 버전
  updatedAt?: string;
}

interface Section {
  id: string;
  heading: string;
  level: number;
  anchor?: string;
  order: number;
}

interface ReadingState {
  bookId: string;
  sectionId?: string;
  scrollTop?: number;
  progressPercent?: number;
  lastOpenedAt: string;
}

interface Bookmark {
  id: string;
  bookId: string;
  sectionId?: string;
  label?: string;
  createdAt: string;
}

interface OfflineBookState {
  bookId: string;
  cachedVersion?: string;
  status: 'not-saved' | 'downloading' | 'saved' | 'partial' | 'failed';
  cachedAssetCount?: number;
  totalAssetCount?: number;
  verifiedAt?: string;
}
```

- 사용자 상태의 스키마 마이그레이션을 고려한다.
- 상태 저장 실패나 `QuotaExceededError` 발생 시 앱이 멈추지 않고 안내한다.
- JSON 백업/복원은 스키마 버전을 포함하고 잘못된 파일을 검증 후 거절한다.

## 9. 권장 프로젝트 구조

```text
devcodex/
├─ CLAUDE.md
├─ README.md
├─ package.json
├─ vite.config.ts
├─ index.html
├─ incoming/                       # 원본 파일 투입 (사용자 제공)
├─ scripts/
│  ├─ import-books.mjs            # 원본 복사 및 메타데이터 추출
│  └─ build-search-index.mjs
├─ public/
│  ├─ books/                       # 실제 서빙되는 HTML과 종속 자산
│  ├─ icons/
│  └─ offline.html
├─ src/
│  ├─ app/
│  ├─ components/
│  │  ├─ BookCard.tsx
│  │  ├─ ReaderFrame.tsx
│  │  ├─ TocDrawer.tsx
│  │  ├─ SearchBar.tsx
│  │  ├─ DownloadManager.tsx
│  │  └─ InstallGuide.tsx
│  ├─ pages/
│  │  ├─ LibraryPage.tsx
│  │  ├─ ReaderPage.tsx
│  │  ├─ BookmarksPage.tsx
│  │  └─ SettingsPage.tsx
│  ├─ db/
│  ├─ pwa/
│  ├─ services/
│  │  ├─ catalog.ts
│  │  ├─ search.ts
│  │  ├─ offline.ts
│  │  └─ legacy-bridge.ts
│  ├─ generated/
│  │  ├─ catalog.json
│  │  └─ search-index.json
│  ├─ styles/
│  └─ main.tsx
├─ tests/
│  ├─ unit/
│  └─ e2e/
├─ docs/
│  ├─ legacy-audit.md
│  ├─ architecture.md
│  ├─ deployment.md
│  └─ mobile-test-checklist.md
└─ .github/workflows/deploy.yml
```

필요에 따라 `src/sw.ts` (injectManifest 전략) 또는 생성형 service worker 설정을 사용한다. **책별 다운로드/삭제/업데이트 상태를 정밀하게 제어할 수 있는 선택을 우선**한다.

## 10. API 및 상태 동작 명세

### 10.1 정적 카탈로그

`GET <BASE_URL>/catalog.json` 또는 앱 번들 내 생성된 catalog를 사용한다. `id`, `title`, `category`, `entryUrl`, `assets`, `sections`, `contentVersion` 필드는 필수 데이터 품질 검증 대상이다.

### 10.2 OfflineManager 인터페이스 예시

```ts
interface OfflineManager {
  downloadBook(bookId: string, onProgress?: (completed: number, total: number) => void): Promise<void>;
  removeBook(bookId: string): Promise<void>;
  verifyBook(bookId: string): Promise<OfflineBookState>;
  getBookStatus(bookId: string): Promise<OfflineBookState>;
  checkForUpdates(): Promise<void>;
}
```

- 다운로드 완료 상태는 실제 Cache Storage의 자료 존재 여부를 재확인해 판단한다.
- 파일 중 하나라도 실패했다면 완료로 표시하지 않는다.
- 중복 다운로드, 취소, 저장공간 부족, 네트워크 끊김에 대해 일관된 상태를 유지한다.

### 10.3 읽기 위치 및 북마크

- iframe 내부 스크롤 위치는 같은 출처·신뢰된 HTML을 전제로 접근 가능 여부를 테스트한다. 접근 불가 시 앱 수준의 마지막 섹션/페이지 위치 저장으로 graceful fallback 한다.
- 위치 저장은 debounce/throttle을 적용해 과도한 IndexedDB 쓰기를 피한다.
- HTML 앵커와 React 라우팅이 충돌하지 않게 처리한다.
- 페이지 이탈 전 북마크/진행률이 유실되지 않도록 저장한다.

## 11. 개발 단계 및 산출물

### Phase 0 — 파일 조사 및 실행 환경

**작업:** 실제 HTML 인벤토리, 기능/의존성 분석, 문제 재현, `legacy-audit.md` 작성. 입력 파일이 없으면 샘플 콘텐츠로 기능만 검증.

**산출물:** 원본 목록, 동작 리스크 표, 프로젝트 초기화, 실행 명령 문서.

### Phase 1 — 앱 셸과 읽기 뷰

**작업:** 홈·서가·리더·카테고리·모바일 네비게이션·기본 테마, 정적 catalog 연계, HTML importer, iframe read view, 에러 처리.

**검증:** 휴대폰에서 목록→책 열기→기존 HTML의 대표 버튼 3종 작동.

### Phase 2 — 검색과 로컬 학습 상태

**작업:** 빌드 검색 인덱스, 통합 검색, 북마크/진행률 IndexedDB, 백업/복원.

**검증:** 새로고침/앱 재실행 뒤 상태 복원; 네트워크 차단 뒤 인덱스 검색.

### Phase 3 — PWA와 오프라인

**작업:** manifest/아이콘/SW, 앱 셸 캐시, 책별 캐시, 상태/다운로드 UX, 업데이트 UX.

**검증:** 실제 HTTPS 및 설치형 환경에서 비행기 모드 테스트.

### Phase 4 — 배포·회귀 테스트·문서

**작업:** GitHub Pages 워크플로, 서브패스 검증, Playwright E2E, 모바일 실기기 체크리스트, README.

**검증:** `npm install`, `npm run build`, `npm run preview`, `npm test`(또는 정의된 대체 명령) 실행 결과 첨부.

## 12. 수용 기준 (Definition of Done)

아래 항목은 체크리스트로 관리하며, **검증하지 못한 항목을 완료로 표시하지 않는다.**

### 핵심 기능

- [ ] 입력 HTML을 원본 변경 없이 앱에 등록 가능하다.
- [ ] 최소 3개의 실제/샘플 족보집을 서가에서 구분하여 열 수 있다.
- [ ] 원본 HTML의 목차/탭/다크모드/코드 복사 중 실제 존재하는 대표 버튼을 테스트하고 결과를 문서화했다.
- [ ] 검색 결과는 실제 원본 HTML의 제목/본문에서 생성되며 가짜 결과가 아니다.
- [ ] 북마크 및 진행률이 새로고침·앱 재시작 이후에도 남는다.
- [ ] JSON 상태 백업/복원이 실제로 작동한다.

### 오프라인

- [ ] 최초 온라인 방문 후 홈/서가가 네트워크 없이 열린다.
- [ ] 사용자가 저장한 책의 HTML/CSS/JS/이미지를 비행기 모드에서 열 수 있다.
- [ ] 오프라인에서 대표 버튼이 동작한다. 온라인 의존 기능이 있으면 명시적으로 예외 안내한다.
- [ ] 다운로드 실패·부분 누락·용량 부족이 '완료'로 잘못 표시되지 않는다.
- [ ] 저장하지 않은 책은 오프라인에서 알기 쉬운 안내를 표시한다.
- [ ] 새 버전 반영 뒤 기존 북마크·진행률이 유지된다.

### 플랫폼/접근성

- [ ] 320px / 375px / 430px / 768px / 데스크톱 뷰포트에서 주요 UI가 정상 작동한다.
- [ ] Android Chrome의 설치/오프라인 동작을 실기기 또는 동등한 테스트에서 확인한다.
- [ ] iOS Safari 홈 화면 설치는 실기기 검증이 필요하며, 미검증 시 문서에 표시한다.
- [ ] 접근 가능한 버튼 이름/포커스/기본 터치 면적/감소된 모션 설정을 확인했다.
- [ ] `https://<user>.github.io/<repo>/` 서브패스에서 파일·SW·manifest 경로가 정상이다.

### 개발 품질

- [ ] 타입 검사/빌드 성공.
- [ ] 주요 인터랙션 Playwright E2E 포함.
- [ ] README에 로컬 실행, 원본 HTML 추가, 배포, PWA 설치, 오프라인 저장법 포함.
- [ ] 테스트 못한 기능과 플랫폼 제약을 명확하게 기재.

## 13. E2E 테스트 시나리오

| ID | 시나리오 | 기대 결과 |
|---|---|---|
| E2E-01 | 처음 방문 → 서가 | 책 목록 표시 |
| E2E-02 | 책 선택 → 리더 진입 | HTML 및 상대 자산 정상 로딩 |
| E2E-03 | 원본 버튼 3개 클릭 | 각 버튼의 의도대로 상태 변경 |
| E2E-04 | 검색어 입력 | 실제 문서 검색 결과 표시 |
| E2E-05 | 북마크 후 새로고침 | 동일 북마크 유지 |
| E2E-06 | 스크롤 후 재진입 | 읽던 위치/섹션 복원 |
| E2E-07 | 오프라인 다운로드 | 자산 수 확인 후 저장 완료 |
| E2E-08 | 브라우저 offline 에뮬레이션 | 저장 책·앱 셸·검색 동작 |
| E2E-09 | 미저장 책 offline 오픈 | 오류 화면과 조치 방법 안내 |
| E2E-10 | 앱 업데이트 | 신규 버전 반영, 개인 데이터 유지 |
| E2E-11 | 서브패스 배포 | 리소스 404 없이 실행 |
| E2E-12 | 잘못된 백업 파일 | 크래시 없이 검증 오류 안내 |

**추가 실기기 수동 검증:** 홈 화면 앱 설치 및 비행기 모드 실행, iOS storage 분리 가능성, 파일 다운로드/복사, 코드 블록 가로 스크롤. Playwright만으로 iOS PWA 설치를 검증했다고 주장하지 않는다.

## 14. 보안·개인정보·운영

- 로그인/서버 수집/광고/분석 SDK는 MVP에 넣지 않는다.
- 개인 학습 상태는 로컬 저장만 하며 외부 전송하지 않는다.
- 외부 출처 HTML/스크립트는 기본적으로 실행을 신뢰하지 않는다. 사용자 소유 문서만 스크립트 실행 대상으로 가져온다.
- 사용자 입력을 `dangerouslySetInnerHTML`로 직접 렌더링하지 않는다. 필요한 경우 신뢰경계와 sanitization을 별도 설계한다.
- 저장공간 삭제·앱 제거·브라우저 데이터 초기화로 기록이 사라질 수 있음을 알리고 JSON 백업을 제공한다.
- 정적 호스팅의 HTML은 공개될 수 있으므로 회사 내부자료·비공개정보를 GitHub Pages 공개 저장소에 올리지 않는다. 비공개 자료는 별도 배포 보안 설계가 필요하다.

## 15. 성능 목표(권장, 측정 후 조정)

- 초기 홈 화면에서 네트워크 요청 수 및 번들 크기를 점검하고 불필요한 대형 라이브러리를 지양한다.
- 대형 HTML/이미지를 첫 방문에 전부 다운로드하지 않는다. 사용자의 책별 오프라인 저장 시에만 전체 저장한다.
- 100개 이상 목차를 가진 책에서도 목차 UI 스크롤과 검색이 크게 끊기지 않도록 한다.
- 검색 인덱스 크기는 실제 문서량으로 측정한 뒤 필요하면 문서별 분할·lazy load를 적용한다.
- 배터리/발열을 줄이기 위해 장식용 지속 애니메이션을 사용하지 않는다.

## 16. 배포 및 운영 매뉴얼 요구

README에 다음 명령을 실제 `package.json`과 일치하도록 제공한다.

```bash
npm install
npm run dev
npm run books:import
npm run build
npm run preview
npm run test
```

- `preview`는 production 빌드 기준 테스트에 사용한다. 모바일 실기기 설치 검증은 **HTTPS 배포 URL**에서 수행한다.
- GitHub Pages 사용 시 repository 이름에 따라 `base`를 설정하고, Actions로 정적 아티팩트 배포.
- 커스텀 도메인 사용 시 `base: '/'` 등 경로 설정 차이 문서화.
- Chrome DevTools Application 패널의 Service Workers/Cache Storage 검증 방법과 실제 휴대폰 비행기 모드 테스트 방법 안내.
- 신규 HTML을 추가했을 때 importer 실행→카탈로그/검색 재생성→커밋→배포→업데이트 확인의 전체 절차 안내.

## 17. 완료 보고 포맷

Claude Code는 종료 시 아래 형식을 사용한다.

```text
[구현 결과]
- 완성된 기능:
- 실제 반영된 HTML 문서:
- 원본 수정 여부: (기본값: 수정 안 함)
- 설치 및 실행 명령:
- 배포 주소: (직접 배포하지 않았다면 '미배포')

[검증]
- 타입 검사/빌드:
- 자동 테스트:
- 오프라인 검증:
- Android 실기기:
- iOS 실기기:

[남은 작업]
- 미완료/제약/리스크:
- 다음 권장 작업:
```

---

## 18. Claude Code 실행용 메인 프롬프트 (복사하여 사용)

```text
현재 프로젝트 루트에 있는 DevCodex_PRD_Claude_Code.md를 처음부터 끝까지 읽고,
이 문서를 단일 구현 기준(Source of Truth)으로 삼아 DevCodex PWA를 실제 구현해줘.

목표는 기존 개발 족보집 HTML을 그대로 통합하고, 휴대폰 홈 화면에 설치하고,
사용자가 선택한 책을 오프라인에서도 검색/열람하고, 기존 HTML 버튼을 사용할 수 있는 앱이다.

중요:
1. 작업 폴더에 기존 HTML이 있는지 먼저 검사하고 결과를 설명해줘.
2. 기존 HTML 원본은 절대 삭제/수정하지 말고, 가져온 복사본만 조정해줘.
3. 사용자 자료가 없으면 샘플임을 명시하고, 실제 자료는 생성된 앱에 나중에 넣을 수 있게 해줘.
4. React + TypeScript + Vite + vite-plugin-pwa + IndexedDB 기반 정적 앱으로 구축해줘.
5. 기획서 Phase 0 → Phase 4 순서로 진행하고, 단계별로 빌드/테스트를 수행해줘.
6. 작동하지 않는 레거시 버튼, CDN 의존성, file:// 제약은 숨기지 말고 audit 문서에 남겨줘.
7. GitHub Pages의 서브패스와 iOS/Android의 PWA 설치·오프라인 차이를 반영해줘.
8. 화면만 만든 뒤 완료하지 말고, build, e2e, 오프라인 시나리오를 검증해줘.
9. 실제 배포 권한이 없다면 배포 코드와 설명까지만 만들고 배포 완료라고 주장하지 마.
10. 마지막에 구현 결과/검증 로그/남은 리스크를 보고해줘.

필요한 코드를 직접 작성하고 테스트하면서 끝까지 구현해줘.
```

---

## 참고 표준/문서

- MDN Service Worker: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- MDN PWA Offline: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- web.dev PWA Installation: https://web.dev/learn/pwa/installation
- vite-plugin-pwa: https://vite-pwa-org.netlify.app/guide/
- Workbox InjectManifest: https://vite-pwa-org.netlify.app/guide/inject-manifest.html

> 검증 원칙: 위 문서의 현재 동작과 프로젝트 의존성 버전을 구현 시 다시 확인한다.
