import { expect, test, type Page } from '@playwright/test';

const reader = (page: Page) => page.frameLocator('iframe.reader-frame');
const card = (page: Page, title: string) => page.getByTestId('book-card').filter({ hasText: title });

test('E2E-01 서가에 책 목록 표시', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('book-card')).toHaveCount(3);
  await expect(page.getByText('기능 검증용 SAMPLE 문서')).toBeVisible();
});

test('E2E-02/03 리더: 상대 자산 로딩 + 원본 버튼 4종 동작', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await card(page, '프론트엔드').getByRole('link').click();
  const f = reader(page);
  await expect(f.locator('h1')).toContainText('프론트엔드 핸드북');
  await expect(f.locator('.banner')).toHaveCSS('background-color', 'rgb(255, 243, 205)'); // style.css
  expect(await f.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0); // images/
  // tabs (script.js)
  await f.getByRole('button', { name: '리페인트' }).click();
  await expect(f.locator('#panel-repaint')).toBeVisible();
  await expect(f.locator('#panel-reflow')).toBeHidden();
  // dark mode
  await f.getByRole('button', { name: '다크모드 전환' }).click();
  await expect(f.locator('body')).toHaveClass(/dark/);
  // accordion
  await f.getByRole('button', { name: 'BFC 설명 펼치기' }).click();
  await expect(f.locator('#acc-body')).toBeVisible();
  // code copy via Clipboard API
  await f.getByRole('button', { name: '코드 복사' }).click();
  await expect(f.locator('.copy-status')).toHaveText('복사됨');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("console.log('micro')");
  // internal anchor link inside the legacy doc
  await f.getByRole('link', { name: 'CSS 레이아웃' }).click();
  await expect(f.locator('#css-layout')).toBeInViewport();
});

test('E2E-03b 인라인 스크립트 단일 파일 책의 버튼', async ({ page }) => {
  await page.goto('/#/book/sample-spring');
  const f = reader(page);
  await f.getByRole('button', { name: '면접 답변 보기' }).click();
  await expect(f.getByText('REQUIRES_NEW는')).toBeVisible();
  expect(await f.locator('img').first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
});

test('E2E-04 통합 검색 → 해당 섹션으로 이동', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('족보집 통합 검색').fill('JWT');
  const results = page.getByTestId('search-results');
  await expect(results).toContainText('JWT 인증 흐름');
  await page.getByLabel('족보집 통합 검색').fill('없는검색어zzz');
  await expect(page.getByText("'없는검색어zzz'에 대한 검색 결과가 없습니다.")).toBeVisible();
  await page.getByLabel('족보집 통합 검색').fill('JWT');
  await results.getByRole('link').first().click();
  await expect(page).toHaveURL(/#\/book\/sample-spring\?s=s2/);
  await expect(reader(page).getByRole('heading', { name: 'JWT 인증 흐름' })).toBeInViewport();
});

test('E2E-05 북마크 후 새로고침해도 유지', async ({ page }) => {
  await page.goto('/#/book/sample-oracle-sql');
  await expect(reader(page).locator('h1')).toBeVisible();
  await page.getByRole('button', { name: '현재 위치 북마크' }).click();
  await expect(page.getByRole('button', { name: '북마크 삭제' })).toBeVisible();
  await page.goto('/#/bookmarks');
  await page.reload();
  await expect(page.getByTestId('bookmark-list')).toContainText('Oracle SQL 노트');
});

test('E2E-06 스크롤 후 재진입 시 위치 복원 + 목차 드로어', async ({ page }) => {
  await page.goto('/#/book/sample-frontend');
  const f = reader(page);
  await expect(f.locator('h1')).toBeVisible();
  // TOC: open, Escape closes, select scrolls
  await page.getByRole('button', { name: '목차 열기' }).click();
  await expect(page.getByRole('dialog', { name: '목차' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '목차' })).toBeHidden();
  await page.getByRole('button', { name: '목차 열기' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '긴 본문 (스크롤 테스트용)' }).click();
  await expect(f.locator('#css-layout-long')).toBeInViewport();

  await page.locator('iframe.reader-frame').evaluate((el: HTMLIFrameElement) => el.contentWindow!.scrollTo(0, 1200));
  await page.waitForTimeout(1200); // throttled save
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByText('이어 읽기')).toBeVisible();
  await page.goto('/#/book/sample-frontend');
  await expect(f.locator('h1')).toBeAttached();
  await expect.poll(() => page.locator('iframe.reader-frame').evaluate((el: HTMLIFrameElement) => el.contentWindow!.scrollY)).toBeGreaterThan(1100);
  await expect(page.getByTestId('progress')).not.toHaveText('0%');
});

test('E2E-07/08/09 오프라인 저장 → 비행기 모드에서 앱 셸·저장 책·검색 / 미저장 책 안내', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // let the SW control the page
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const c = card(page, '프론트엔드');
  await c.getByRole('button', { name: '오프라인 저장' }).click();
  await expect(c.getByTestId('offline-saved')).toBeVisible();
  await expect(page.getByText('4개 파일 확인')).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('book-card')).toHaveCount(3);
  await expect(page.getByText('오프라인', { exact: true })).toBeVisible();

  await page.getByLabel('족보집 통합 검색').fill('트랜잭션');
  await expect(page.getByTestId('search-results')).toContainText('트랜잭션');

  await card(page, '프론트엔드').getByRole('link').click();
  const f = reader(page);
  await expect(f.locator('.banner')).toHaveCSS('background-color', 'rgb(255, 243, 205)');
  await f.getByRole('button', { name: '리페인트' }).click();
  await expect(f.locator('#panel-repaint')).toBeVisible();

  await page.goto('/#/book/sample-spring');
  await expect(page.getByRole('alert')).toContainText('오프라인에서 열 수 없는 책입니다');

  // Prove the SW books cache (not the HTTP cache) is serving: no-store bypasses the HTTP cache.
  const status = (u: string) => page.evaluate((url) => fetch(url, { cache: 'no-store' }).then((r) => r.status, () => 'network-error'), u);
  expect(await status('books/sample-frontend/style.css')).toBe(200);
  expect(await status('books/sample-spring/sample-spring.html')).toBe('network-error');
  // Direct navigation to an unsaved book while offline → SW offline fallback page, not a browser error
  await page.goto('/books/sample-spring/sample-spring.html');
  await expect(page.getByRole('heading', { name: '오프라인 상태입니다' })).toBeVisible();

  await page.goto('/#/');
  await card(page, '프론트엔드').getByRole('button', { name: /삭제/ }).click();
  await expect(card(page, '프론트엔드').getByTestId('offline-saved')).toHaveCount(0);
  await context.setOffline(false);
});

test.describe('다운로드 실패 처리', () => {
  test.use({ serviceWorkers: 'block' });
  test('누락 자산이 있으면 저장 완료로 표시하지 않음', async ({ page }) => {
    await page.route('**/books/sample-frontend/script.js', (r) => r.fulfill({ status: 404 }));
    await page.goto('/');
    const c = card(page, '프론트엔드');
    await c.getByRole('button', { name: '오프라인 저장' }).click();
    await expect(c.getByText(/일부 저장 3\/4/)).toBeVisible();
    await expect(c.getByText(/script\.js \(404\)/)).toBeVisible();
    await expect(c.getByTestId('offline-saved')).toHaveCount(0);
    await page.unroute('**/books/sample-frontend/script.js');
    await c.getByRole('button', { name: '다시 저장' }).click();
    await expect(c.getByTestId('offline-saved')).toBeVisible();
  });
});

test('E2E-12 백업 내보내기/복원 + 잘못된 파일 거절', async ({ page }) => {
  await page.goto('/#/book/sample-spring');
  await page.getByRole('button', { name: '현재 위치 북마크' }).click();
  await page.goto('/#/settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'JSON 내보내기' }).click()]);
  const backup = JSON.parse(await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
  expect(backup).toMatchObject({ app: 'devcodex', schemaVersion: 1 });
  expect(backup.bookmarks.length).toBeGreaterThan(0);

  const input = page.getByTestId('backup-input');
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await expect(page.getByRole('alert')).toContainText('JSON 형식이 아닌 파일');
  await input.setInputFiles({ name: 'bad2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...backup, schemaVersion: 99 })) });
  await expect(page.getByRole('alert')).toContainText('지원하지 않는 백업 버전');

  await input.setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...backup, bookmarks: [], settings: { theme: 'dark' } })) });
  await expect(page.getByText('백업을 복원했습니다.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/#/bookmarks');
  await expect(page.getByText('아직 북마크가 없습니다')).toBeVisible();
});

test('PWA 메타: manifest·아이콘 200, SW 스코프', async ({ page, request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m).toMatchObject({ start_url: '/', scope: '/', id: '/', display: 'standalone' });
  for (const i of m.icons) expect((await request.get('/' + i.src)).status()).toBe(200);
  expect((await request.get('/icons/apple-touch-icon.png')).status()).toBe(200);
  await page.goto('/');
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toBe('http://localhost:4173/');
});

for (const width of [320, 375, 430, 768, 1280]) {
  test(`반응형 ${width}px: 가로 넘침 없음`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/', '/#/settings', '/#/book/sample-oracle-sql']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(0);
    }
  });
}
