import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ChevronsLeft,
  HelpCircle,
  ChevronsRight,
  LayoutDashboard,
  Moon,
  GraduationCap,
  NotebookPen,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Target,
  TrendingUp,
} from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { Aurora } from '@/components/art/Aurora';
import { HeaderArcs, HeaderSpark } from '@/components/art/Flourish';
import { SenseiOwl, SenseiOwlGlyph } from '@/components/art/SenseiOwl';
import { useSettings } from '@/state/settings';
import { observe } from '@/lib/observe';
import { SessionReplay } from '@/components/replay/SessionReplay';
import { GlobalSensei } from '@/components/tutor/GlobalSensei';
import { Tour, hasSeenTour } from '@/components/tour/Tour';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * Built per render, not hoisted to a module constant: `t` resolves against the
 * active locale, so a constant would freeze whichever language happened to be
 * selected when this module was first imported.
 */
function navItems() {
  return [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard, end: true, group: 'learn' },
    { to: '/courses', label: t.nav.catalog, icon: BookOpen, group: 'learn' },
    { to: '/practice', label: t.nav.practice, icon: Target, group: 'learn', tour: 'practice' },
    { to: '/notebook', label: t.nav.notebook, icon: NotebookPen, group: 'learn', tour: 'notebook' },
    // The owl stands in for the tutor everywhere it speaks -- nav, chat avatar,
    // empty state -- so "Ask Sensei" reads as asking a character, not a feature.
    { to: '/tutor', label: t.nav.tutor, icon: SenseiOwlGlyph, group: 'learn', tour: 'tutor' },
    { to: '/teach', label: t.nav.teach, icon: GraduationCap, group: 'teach', tour: 'teach' },
    { to: '/progress', label: t.nav.progress, icon: TrendingUp, group: 'you', tour: 'progress' },
    { to: '/settings', label: t.nav.settings, icon: SettingsIcon, group: 'you' },
  ] as const;
}

export function AppShell() {
  const { sidebarCollapsed, toggleSidebar, isDark, setTheme } = useSettings();
  const location = useLocation();

  // Reset scroll between routes; the lesson view manages its own panes.
  useEffect(() => {
    document.getElementById('s-main')?.scrollTo({ top: 0 });
    observe('route', { path: location.pathname });
  }, [location.pathname]);

  const [tourOpen, setTourOpen] = useState(false);
  // Offer the tour once, after the shell has painted so targets exist.
  useEffect(() => {
    if (hasSeenTour()) return;
    const id = window.setTimeout(() => setTourOpen(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  const nav = navItems();
  const groups: Array<{ key: string; label: string }> = [
    { key: 'learn', label: t.nav.sectionLearn },
    { key: 'teach', label: t.nav.sectionTeach },
    { key: 'you', label: t.nav.sectionYou },
  ];

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-page">
      {/* Decorative background for the whole app; every surface above it is
          translucent so the colour reads through. */}
      <Aurora />
      {/* One owl for the whole app: follows the student, draggable, per-problem thread. */}
      <GlobalSensei />
      <Tour open={tourOpen} onClose={() => setTourOpen(false)} />

      <a
        href="#s-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'relative z-10 flex shrink-0 flex-col border-r border-line bg-surface/80 transition-[width] duration-300 ease-smooth',
          sidebarCollapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        {/* vertical gradient wash down the rail */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgb(var(--s-grad-1) / 0.10), rgb(var(--s-grad-2) / 0.05) 45%, rgb(var(--s-grad-3) / 0.07))',
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px"
          style={{
            backgroundImage:
              'linear-gradient(180deg, transparent, rgb(var(--s-grad-2) / 0.5) 30%, rgb(var(--s-grad-3) / 0.35) 70%, transparent)',
          }}
        />
        <div
          className={cn(
            'relative flex h-16 shrink-0 items-center gap-2.5 border-b border-line',
            sidebarCollapsed ? 'justify-center px-2' : 'px-5',
          )}
        >
          <Logo />
          {!sidebarCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="s-gradient-text truncate text-[15px] font-semibold tracking-[-0.02em]">
                {t.app.name}
              </p>
              <p className="truncate text-2xs text-ink-muted">{t.app.tagline}</p>
            </div>
          ) : null}
        </div>

        <nav className="s-scroll relative flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g, gi) => (
            <div key={g.key} className={gi > 0 ? 'mt-6' : undefined}>
              {!sidebarCollapsed ? (
                <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                  {g.label}
                </p>
              ) : null}
              <ul className="space-y-1">
                {nav.filter((n) => n.group === g.key).map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      data-tour={'tour' in item ? item.tour : undefined}
                      end={'end' in item ? item.end : false}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200 ease-smooth',
                          sidebarCollapsed && 'justify-center px-0',
                          isActive
                            ? 'text-accent shadow-glow-sm'
                            : 'text-ink-muted hover:bg-surface-alt/80 hover:text-ink',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <>
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 rounded-xl"
                                style={{
                                  backgroundImage:
                                    'linear-gradient(100deg, rgb(var(--s-grad-1) / 0.20), rgb(var(--s-grad-2) / 0.16) 55%, rgb(var(--s-grad-3) / 0.14))',
                                }}
                              />
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-1.5 left-0 w-[3px] rounded-r-full"
                                style={{
                                  backgroundImage:
                                    'linear-gradient(180deg, rgb(var(--s-grad-1)), rgb(var(--s-grad-3)))',
                                }}
                              />
                            </>
                          ) : null}
                          <item.icon size={18} className="relative shrink-0" />
                          {!sidebarCollapsed ? (
                            <span className="relative truncate">{item.label}</span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'relative shrink-0 border-t border-line p-3',
            sidebarCollapsed ? 'space-y-2' : 'space-y-3',
          )}
        >
          {!sidebarCollapsed ? (
            <div
              className="flex items-start gap-2.5 rounded-xl border border-success/25 bg-success-bg px-3 py-2.5"
              title={t.app.offlineTooltip}
            >
              <ShieldCheck size={15} className="mt-px shrink-0 text-success-text" />
              <div className="min-w-0">
                <p className="text-2xs font-semibold text-success-text">{t.app.offlineBadge}</p>
                <p className="mt-0.5 text-2xs leading-snug text-success-text/80">
                  {t.app.offlineCaption}
                </p>
              </div>
            </div>
          ) : null}

          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <SessionReplay />
            </div>
          ) : null}

          <div className={cn('flex items-center gap-1', sidebarCollapsed && 'flex-col')}>
            <IconButton label={t.tour.start} onClick={() => setTourOpen(true)}>
              <HelpCircle size={16} />
            </IconButton>
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

      <main id="s-main" className="s-scroll relative z-10 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

/** The phone app's launcher icon, at sidebar size. */
function Logo() {
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-glow-sm"
      aria-hidden="true"
    >
      <SenseiOwl size={36} />
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
    <div
      className={cn(
        'relative mx-auto px-8 py-9 xl:px-12',
        wide ? 'max-w-[1600px]' : 'max-w-[1240px]',
      )}
    >
      {title ? (
        <header className="relative mb-8 flex flex-wrap items-end justify-between gap-4">
          {/* concentric arcs behind the title block */}
          <HeaderArcs className="pointer-events-none absolute -top-10 right-0 hidden h-40 w-[340px] opacity-70 lg:block" />
          <div className="relative min-w-0">
            <div className="mb-2 flex items-center gap-2.5">
              <HeaderSpark className="h-3.5 w-11" />
              <span
                aria-hidden="true"
                className="h-px w-14"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgb(var(--s-grad-3) / 0.45), transparent)',
                }}
              />
            </div>
            <h1 className="text-[28px] font-semibold tracking-[-0.028em] text-ink">{title}</h1>
            {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="relative flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
