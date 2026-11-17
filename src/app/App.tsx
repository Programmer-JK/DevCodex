import { Bookmark, Library, Settings, WifiOff } from 'lucide-react';
import { BookmarksPage } from '../pages/BookmarksPage';
import { LibraryPage } from '../pages/LibraryPage';
import { ReaderPage } from '../pages/ReaderPage';
import { SettingsPage } from '../pages/SettingsPage';
import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { useOnline } from './hooks';
import { useRoute } from './router';
import { Toaster } from './toast';

const NAV = [
  { href: '#/', key: '', label: '서가', Icon: Library },
  { href: '#/bookmarks', key: 'bookmarks', label: '북마크', Icon: Bookmark },
  { href: '#/settings', key: 'settings', label: '설정', Icon: Settings },
];

export function App() {
  const { parts, query } = useRoute();
  const online = useOnline();
  const [page = '', arg] = parts;

  if (page === 'book' && arg)
    return (<><ReaderPage bookId={arg} sectionId={query.get('s') ?? undefined} /><UpdatePrompt /><Toaster /></>);

  return (
    <div className="shell">
      <header className="topbar">
        <a href="#/" className="brand">DevCodex</a>
        {!online ? <span className="badge badge-warn"><WifiOff size={14} aria-hidden /> 오프라인</span> : null}
      </header>
      {page === 'bookmarks' ? <BookmarksPage /> : page === 'settings' ? <SettingsPage /> : <LibraryPage />}
      <nav className="tabbar" aria-label="주 메뉴">
        {NAV.map(({ href, key, label, Icon }) => (
          <a key={key} href={href} className="tab" aria-current={page === key ? 'page' : undefined}>
            <Icon size={20} aria-hidden /><span>{label}</span>
          </a>
        ))}
      </nav>
      <UpdatePrompt />
      <Toaster />
    </div>
  );
}
