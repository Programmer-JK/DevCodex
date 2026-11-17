import { useEffect, useState } from 'react';

type Toast = { id: number; text: string; kind: 'info' | 'error' };
let next = 0;
const listeners = new Set<(t: Toast) => void>();

export function notify(text: string, kind: Toast['kind'] = 'info') {
  const t = { id: next++, text, kind };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const l = (t: Toast) => {
      setItems((xs) => [...xs, t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.kind === 'error' ? 8000 : 4000);
    };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>)}
    </div>
  );
}
