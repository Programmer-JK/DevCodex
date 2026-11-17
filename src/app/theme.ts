export type Theme = 'light' | 'dark' | 'system';
const KEY = 'devcodex-theme';

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch { return 'system'; }
}

export function applyTheme(t: Theme = getTheme()) {
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch { /* storage blocked: theme still applies for this session */ }
  applyTheme(t);
}
