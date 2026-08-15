import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Moon,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
} from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { useSettings } from '@/state/settings';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: t.nav.dashboard, icon: LayoutDashboard, end: true, group: 'learn' },
  { to: '/courses', label: t.nav.catalog, icon: BookOpen, group: 'learn' },
  { to: '/practice', label: t.nav.practice, icon: Target, group: 'learn' },
  { to: '/tutor', label: t.nav.tutor, icon: Sparkles, group: 'learn' },
  { to: '/progress', label: t.nav.progress, icon: TrendingUp, group: 'you' },
  { to: '/settings', label: t.nav.settings, icon: SettingsIcon, group: 'you' },
] as const;

export function AppShell() {
  const { sidebarCollapsed, toggleSidebar, isDark, setTheme } = useSettings();
  const location = useLocation();

  // Reset scroll between routes; the lesson view manages its own panes.
  useEffect(() => {
    document.getElementById('s-main')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const groups: Array<{ key: string; label: string }> = [
    { key: 'learn', label: t.nav.sectionLearn },
    { key: 'you', label: t.nav.sectionYou },
  ];

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-page">
      <a
        href="#s-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-300 ease-smooth',
          sidebarCollapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-2.5 border-b border-line',
            sidebarCollapsed ? 'justify-center px-2' : 'px-5',
          )}
        >
          <Logo />
          {!sidebarCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-ink">
                {t.app.name}
              </p>
              <p className="truncate text-2xs text-ink-muted">{t.app.tagline}</p>
            </div>
          ) : null}
        </div>

        <nav className="s-scroll flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g, gi) => (
            <div key={g.key} className={gi > 0 ? 'mt-6' : undefined}>
              {!sidebarCollapsed ? (
                <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                  {g.label}
                </p>
              ) : null}
              <ul className="space-y-1">
                {NAV.filter((n) => n.group === g.key).map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={'end' in item ? item.end : false}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200 ease-smooth',
                          sidebarCollapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-accent-soft text-accent'
                            : 'text-ink-muted hover:bg-surface-alt hover:text-ink',
                        )
                      }
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'shrink-0 border-t border-line p-3',
            sidebarCollapsed ? 'space-y-2' : 'space-y-3',
          )}
        >
          {!sidebarCollapsed ? (
            <div
              className="flex items-start gap-2.5 rounded-xl bg-success-bg px-3 py-2.5"
              title={t.app.offlineTooltip}
            >
              <ShieldCheck size={15} className="mt-px shrink-0 text-success-text" />
              <div className="min-w-0">
                <p className="text-2xs font-semibold text-success-text">{t.app.offlineBadge}</p>
                <p className="mt-0.5 text-2xs leading-snug text-success-text/80">
                  No third-party requests
                </p>
              </div>
            </div>
          ) : null}

          <div className={cn('flex items-center gap-1', sidebarCollapsed && 'flex-col')}>
            <IconButton
              label={t.nav.toggleTheme}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </IconButton>
            <IconButton
              label={sidebarCollapsed ? t.nav.expand : t.nav.collapse}
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
            </IconButton>
          </div>
        </div>
      </aside>

      <main id="s-main" className="s-scroll min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function Logo() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-soft"
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
        <path
          d="M10 21.5c3 1.9 10.5 2 10.5-1.9 0-4-9.3-2.6-9.3-6.6 0-3.7 7-3.7 9.8-1.7"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Standard page frame: constrained width, generous desktop gutters. */
export function Page({
  title,
  subtitle,
  actions,
  children,
  wide,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('mx-auto px-8 py-9 xl:px-12', wide ? 'max-w-[1600px]' : 'max-w-[1240px]')}>
      {title ? (
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
