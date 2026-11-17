import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/db', () => ({ db: {} }));
const { validateBackup } = await import('../../src/services/backup');

const good = {
  app: 'devcodex', schemaVersion: 1, exportedAt: '2026-11-17T00:00:00Z',
  reading: [{ bookId: 'a', lastOpenedAt: '2026-11-17T00:00:00Z', scrollTop: 10, progressPercent: 5 }],
  bookmarks: [{ id: '1', bookId: 'a', sectionId: 's1', createdAt: '2026-11-17T00:00:00Z' }],
  settings: { theme: 'dark' },
};

describe('validateBackup', () => {
  it('accepts a valid backup', () => expect(validateBackup(good)).toBe(good));
  it.each([
    ['non-object', 42, '백업 파일이 아닙니다'],
    ['other app', { ...good, app: 'x' }, '백업 파일이 아닙니다'],
    ['future schema', { ...good, schemaVersion: 2 }, '지원하지 않는 백업 버전'],
    ['missing arrays', { ...good, bookmarks: undefined }, '구조가 올바르지 않습니다'],
    ['bad bookmark', { ...good, bookmarks: [{ id: 1 }] }, '북마크 #1'],
    ['bad reading', { ...good, reading: [{ bookId: 'a', lastOpenedAt: 'x', scrollTop: 'big' }] }, '읽기 기록 #1'],
    ['bad theme', { ...good, settings: { theme: 'neon' } }, '설정 값'],
  ])('rejects %s', (_, input, msg) => expect(() => validateBackup(input)).toThrow(msg));
});
