export type Category = 'frontend' | 'java-spring' | 'database' | 'other';

export interface Section {
  id: string;
  heading: string;
  level: number;
  anchor?: string;
  order: number; // index in document.querySelectorAll('h1..h6') of the original document
}

export interface Book {
  id: string;
  title: string;
  description?: string;
  category: Category;
  tags: string[];
  sample?: boolean;
  trusted: boolean;
  entryUrl: string; // relative to BASE_URL
  assets: string[]; // relative to BASE_URL, includes entryUrl
  sizeBytes: number;
  sections: Section[];
  contentVersion: string;
  updatedAt?: string;
}

export interface SearchEntry {
  bookId: string;
  sectionId?: string;
  heading: string;
  textSnippet: string;
  rankHint: number;
  sourceUrl: string;
}

export interface ReadingState {
  bookId: string;
  sectionId?: string;
  scrollTop?: number;
  progressPercent?: number;
  lastOpenedAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  sectionId?: string;
  label?: string;
  createdAt: string;
}

export interface OfflineBookState {
  bookId: string;
  cachedVersion?: string;
  status: 'not-saved' | 'downloading' | 'saved' | 'partial' | 'failed';
  cachedAssetCount?: number;
  totalAssetCount?: number;
  verifiedAt?: string;
  error?: string;
}
