// Bottom tab bar — the app's whole navigation. Four destinations; every
// other page hangs off one of them (packs/archive under Explore,
// help/docs/about/license under Settings). The Conversation route
// renders without this bar so the live Conversation owns the window.
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Compass, NotebookPen, Settings } from 'lucide-react';

interface Tab {
  label: string;
  path: string;
  icon: typeof Sun;
  // Path prefixes (besides `path`) that light this tab up.
  also: string[];
}

const TABS: Tab[] = [
  { label: 'Today', path: '/', icon: Sun, also: [] },
  { label: 'Explore', path: '/scenarios', icon: Compass, also: ['/packs', '/archive'] },
  { label: 'Journal', path: '/sessions', icon: NotebookPen, also: ['/analysis'] },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    also: ['/help', '/about', '/license', '/documentation'],
  },
];

export function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (tab: Tab) =>
    tab.path === '/'
      ? location.pathname === '/'
      : [tab.path, ...tab.also].some(
          (p) => location.pathname === p || location.pathname.startsWith(p + '/')
        );

  return (
    <nav className="shrink-0 border-t border-ink/10 bg-paper-warm relative z-10">
      <div className="max-w-[640px] mx-auto grid grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-accent' : 'text-ink-quiet hover:text-ink'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[0.66rem] uppercase tracking-[0.14em] font-sans">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
