import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Section } from '../services/types';

/** Native <dialog>: Escape + focus trap for free. Backdrop click and the back button also close it. */
export function TocDrawer({ open, sections, current, onSelect, onClose }: {
  open: boolean; sections: Section[]; current?: string; onSelect: (s: Section) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      history.pushState({ toc: true }, '');
      const onPop = () => onClose();
      addEventListener('popstate', onPop, { once: true });
      return () => {
        removeEventListener('popstate', onPop);
        if (history.state?.toc) history.back(); // closed by Escape/backdrop/selection: drop the extra entry
      };
    }
    if (!open && d.open) d.close();
  }, [open, onClose]);

  return (
    <dialog ref={ref} className="drawer" aria-label="목차" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="drawer-inner">
        <header className="drawer-head">
          <h2>목차</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="목차 닫기"><X size={20} aria-hidden /></button>
        </header>
        {sections.length ? (
          <ul className="toc-list">
            {sections.map((s) => (
              <li key={s.id} style={{ paddingInlineStart: `${(s.level - 1) * 12}px` }}>
                <button type="button" className={s.id === current ? 'toc-item active' : 'toc-item'} aria-current={s.id === current ? 'location' : undefined} onClick={() => onSelect(s)}>
                  {s.heading}
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="empty">이 문서에서 목차를 찾지 못했습니다.</p>}
      </div>
    </dialog>
  );
}
