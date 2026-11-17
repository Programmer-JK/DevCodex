import catalog from '../generated/catalog.json';
import type { Book, Category } from './types';

export const books = catalog.books as Book[];
export const getBook = (id: string) => books.find((b) => b.id === id);
/** Absolute URL for a BASE_URL-relative path (works under any deploy subpath). */
export const appUrl = (rel: string) => new URL(import.meta.env.BASE_URL + rel, location.origin).href;

export const CATEGORY_LABEL: Record<Category, string> = {
  frontend: 'Frontend',
  'java-spring': 'Java & Spring',
  database: 'SQL & Oracle',
  other: '기타',
};
