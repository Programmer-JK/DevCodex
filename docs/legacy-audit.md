# Legacy HTML Audit

> `npm run books:import`가 자동 생성합니다. 직접 수정하지 마세요. 원본 파일은 읽기만 하며, 복사본에도 경로 보정을 적용하지 않았습니다(수정 사항 없음).

사용자 HTML 2개를 가져왔습니다.

| 책 | 원본 | 인라인 스크립트 | 외부 CDN | fetch/모듈 | 부모창/팝업 | file:// | viewport 메타 | 고정 폭(px) | Clipboard | 누락/범위밖/루트절대 |
|---|---|---|---|---|---|---|---|---|---|---|
| frontend-basic | `incoming/Frontend_Basic.html` | 1 | 없음 | 없음 | 없음 | 없음 | 있음 | - | 있음 | - |
| java-spring | `incoming/Java_Spring.html` | 1 | 없음 | 있음 | 없음 | file:///.../lab.html</code>로 | 있음 | - | 있음 | - |

## 처리 지침

- **인라인 스크립트/Clipboard:** 리더는 동일 출처 iframe에서 원본 JS를 그대로 실행합니다. Clipboard API는 HTTPS(또는 localhost)에서만 동작하므로 배포 URL에서 확인하세요.
- **외부 CDN:** 오프라인 저장 대상(assets)에 포함되지 않습니다. 오프라인에서 필요하면 파일을 책 폴더에 넣고 상대 경로로 바꾼 뒤 다시 import 하세요.
- **file:// / 루트 절대 경로(`/x`) / 책 폴더 밖 참조(`../x`):** 웹에서 동작하지 않습니다. 원본을 상대 경로로 고친 뒤 다시 import 해야 합니다(자동 치환 안 함).
- **viewport 메타 없음/고정 폭:** 모바일에서 축소 표시되거나 가로 스크롤이 생길 수 있습니다. 원본 보기는 그대로 유지합니다.
- **부모창/팝업 의존:** iframe 안에서 `window.top` 등은 앱 셸을 가리킵니다. 개별 검증이 필요합니다.
- **신뢰:** `books.meta.json`에서 `"trusted": false`로 지정한 책은 스크립트 없이(sandbox) 렌더링됩니다.
