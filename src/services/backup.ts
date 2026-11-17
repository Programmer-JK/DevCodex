import { db } from '../db';
import type { Bookmark, ReadingState } from './types';
import { getTheme, setTheme, type Theme } from '../app/theme';

export const BACKUP_SCHEMA_VERSION = 1;

export interface Backup {
  app: 'devcodex';
  schemaVersion: number;
  exportedAt: string;
  reading: ReadingState[];
  bookmarks: Bookmark[];
  settings: { theme: Theme };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown) => typeof x === 'string';
const optStr = (x: unknown) => x === undefined || isStr(x);
const optNum = (x: unknown) => x === undefined || (typeof x === 'number' && Number.isFinite(x));

/** Validates untrusted JSON; throws Error with a user-facing message. */
export function validateBackup(x: unknown): Backup {
  if (!isObj(x) || x.app !== 'devcodex') throw new Error('DevCodex 백업 파일이 아닙니다.');
  if (x.schemaVersion !== BACKUP_SCHEMA_VERSION) throw new Error(`지원하지 않는 백업 버전입니다 (${String(x.schemaVersion)}).`);
  if (!Array.isArray(x.reading) || !Array.isArray(x.bookmarks) || !isObj(x.settings)) throw new Error('백업 파일 구조가 올바르지 않습니다.');
  x.reading.forEach((r, i) => {
    if (!isObj(r) || !isStr(r.bookId) || !isStr(r.lastOpenedAt) || !optStr(r.sectionId) || !optNum(r.scrollTop) || !optNum(r.progressPercent))
      throw new Error(`읽기 기록 #${i + 1}이 올바르지 않습니다.`);
  });
  x.bookmarks.forEach((b, i) => {
    if (!isObj(b) || !isStr(b.id) || !isStr(b.bookId) || !isStr(b.createdAt) || !optStr(b.sectionId) || !optStr(b.label))
      throw new Error(`북마크 #${i + 1}이 올바르지 않습니다.`);
  });
  if (!['light', 'dark', 'system'].includes(x.settings.theme as string)) throw new Error('설정 값이 올바르지 않습니다.');
  return x as unknown as Backup;
}

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'devcodex', schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: new Date().toISOString(),
    reading: await db.getAll('reading'), bookmarks: await db.getAll('bookmarks'), settings: { theme: getTheme() },
  };
}

/** Replaces reading state, bookmarks and settings. Offline caches are untouched. */
export async function restoreBackup(b: Backup) {
  await db.replaceAll('reading', b.reading);
  await db.replaceAll('bookmarks', b.bookmarks);
  setTheme(b.settings.theme);
}
