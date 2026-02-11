'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { BarChart3, Calculator, ChevronRight, Divide, Gem, LogOut, Menu, Minus, Moon, Plus, Sun, Trophy, User, X } from 'lucide-react';

import { cn } from '../lib/utils';
import { useCrystals } from '../lib/useCrystals';

type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authed'; user: { id: string; email?: string | null; role?: string | null } }
  | { status: 'error' };

function getInitialDarkMode() {
  try {
    const saved = window.localStorage.getItem('smmtry.dark');
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    // ignore
  }
  try {
    const legacy = window.localStorage.getItem('smmtry_trainer_theme');
    if (legacy === 'dark') return true;
    if (legacy === 'light') return false;
  } catch {
    // ignore
  }
  return document.documentElement.classList.contains('dark');
}

function getInitialCollapsed() {
  try {
    return window.localStorage.getItem('smmtry_trainer_sidebar') === 'collapsed';
  } catch {
    return false;
  }
}

export function TrainerShell(props: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const { totalCrystals } = useCrystals();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const toggleDarkMode = () => {
    const next = !(darkMode ?? getInitialDarkMode());
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      window.localStorage.setItem('smmtry.dark', next ? '1' : '0');
      window.localStorage.setItem('smmtry_trainer_theme', next ? 'dark' : 'light');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const initial = getInitialDarkMode();
    setDarkMode(initial);
    document.documentElement.classList.toggle('dark', initial);
    try {
      window.localStorage.setItem('smmtry.dark', initial ? '1' : '0');
      window.localStorage.setItem('smmtry_trainer_theme', initial ? 'dark' : 'light');
    } catch {
      // ignore
    }

    const c = getInitialCollapsed();
    setCollapsed(c);
  }, []);

  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const doLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    window.location.href = '/';
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: { accept: 'application/json' },
        });
        if (cancelled) return;
        if (!res.ok) {
          setAuth({ status: 'guest' });
          return;
        }
        const body: any = await res.json();
        const user = body?.user || body?.me?.user || body?.data?.user || body;
        const id = String(user?.id || user?.userId || '').trim();
        setAuth({
          status: 'authed',
          user: {
            id: id || 'user',
            email: typeof user?.email === 'string' ? user.email : null,
            role: typeof user?.role === 'string' ? user.role : null,
          },
        });
      } catch {
        if (cancelled) return;
        setAuth({ status: 'guest' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = useMemo(
    () => [
      { group: 'Тренажёры', label: 'Сложение', href: '/addition', icon: Plus },
      { group: 'Тренажёры', label: 'Вычитание', href: '/subtraction', icon: Minus },
      { group: 'Тренажёры', label: 'Умножение', href: '/multiplication', icon: Calculator },
      { group: 'Тренажёры', label: 'Деление', href: '/division', icon: Divide },
      { group: 'Прогресс', label: 'Мои достижения', href: '/progress/achievements', icon: Trophy },
      { group: 'Прогресс', label: 'Статистика', href: '/progress/stats', icon: BarChart3 },
    ],
    [],
  );

  const activeHref = useMemo(() => {
    const sorted = [...navItems].sort((a, b) => b.href.length - a.href.length);
    for (const item of sorted) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) return item.href;
    }
    return null;
  }, [navItems, pathname]);

  const hideMobileHeader = useMemo(() => {
    // Avoid double stacked headers in trainer flow on mobile (TrainerFlow provides its own header).
    return (
      pathname === '/addition' ||
      pathname.startsWith('/addition/') ||
      pathname === '/subtraction' ||
      pathname.startsWith('/subtraction/') ||
      pathname === '/multiplication' ||
      pathname.startsWith('/multiplication/') ||
      pathname === '/division' ||
      pathname.startsWith('/division/') ||
      pathname === '/trainers' ||
      pathname.startsWith('/trainers/')
    );
  }, [pathname]);

  const setCollapsedAndPersist = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem('smmtry_trainer_sidebar', next ? 'collapsed' : 'expanded');
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="min-h-screen flex w-full"
      style={
        {
          // Used by CenteredOverlay to center "Saving..." relative to the working area (excluding sidebar on md+).
          '--smmtry-sidebar-w': collapsed ? '4rem' : '16rem',
        } as any
      }
    >
      {/* Mobile overlay */}
      {mobileOpen ? <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} /> : null}

      <aside
        className={cn(
          'z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
          'fixed inset-y-0 left-0 md:sticky md:top-0 md:h-screen overflow-y-auto',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center gap-3 px-4', collapsed ? 'h-14 justify-center' : 'h-14')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
            <Calculator className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-sidebar-foreground leading-tight">МатТренер</h1>
              <p className="text-xs text-muted-foreground">Учись играючи</p>
            </div>
          ) : null}
        </div>

        {/* Nav */}
        <nav className={cn('flex-1 px-3 pb-3', collapsed ? 'pt-1' : 'pt-2')}>
          {(['Тренажёры', 'Прогресс'] as const).map((group) => {
            const items = navItems.filter((x) => x.group === group);
            return (
              <div key={group} className="mb-4">
                {!collapsed ? (
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>
                ) : null}

                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = item.href === activeHref;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-sidebar-accent',
                          active && 'bg-sidebar-accent text-sidebar-primary font-semibold',
                          collapsed && 'justify-center px-2',
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                        {!collapsed && active ? <ChevronRight className="w-4 h-4 ml-auto text-sidebar-primary" /> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setCollapsedAndPersist(false)}
                className="w-10 h-10 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-center"
                aria-label="Развернуть меню"
                title="Развернуть меню"
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
              </button>

              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-10 h-10 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-center"
                title={(darkMode ?? false) ? 'Светлая тема' : 'Тёмная тема'}
              >
                {(darkMode ?? false) ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              <a
                className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
                href={auth.status === 'authed' ? '/addition' : '/login'}
                title={auth.status === 'authed' ? 'Аккаунт' : 'Войти'}
              >
                <User className="w-5 h-5 text-brand-dark-foreground" />
              </a>

              <div className="w-10 h-10 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-center" title={`Кристаллы: ${totalCrystals}`}>
                <div className="flex items-center gap-1 text-xs font-semibold text-sidebar-foreground">
                  <Gem className="w-4 h-4 text-brand" />
                  <span className="tabular-nums">{totalCrystals}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-brand-dark-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {auth.status === 'authed' ? auth.user.email || auth.user.id : auth.status === 'loading' ? 'Загрузка…' : 'Гость'}
                  </p>
                  {auth.status === 'authed' ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate">{auth.user.role || 'user'}</p>
                      <div className="ml-auto inline-flex items-center gap-1 rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-semibold text-sidebar-foreground" title="Кристаллы">
                        <Gem className="w-3.5 h-3.5 text-brand" />
                        <span className="tabular-nums">{totalCrystals}</span>
                      </div>
                      <button
                        type="button"
                        onClick={doLogout}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Выйти"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Выйти
                      </button>
                    </div>
                  ) : (
                    <a className="text-xs text-primary hover:underline" href="/login">
                      Войти
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCollapsedAndPersist(true)}
                  className="w-10 h-10 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-center"
                  aria-label="Свернуть меню"
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-sidebar-accent transition-colors"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  {(darkMode ?? false) ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {(darkMode ?? false) ? 'Тёмная тема' : 'Светлая тема'}
                </span>
                <span className={cn('inline-flex w-9 h-5 rounded-full p-0.5 transition-colors', (darkMode ?? false) ? 'bg-primary/30' : 'bg-muted')}>
                  <span
                    className={cn(
                      'w-4 h-4 rounded-full bg-card shadow-sm transition-transform',
                      (darkMode ?? false) ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </span>
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile header */}
        {!hideMobileHeader ? (
          <header className="h-14 flex items-center border-b border-border px-4 md:hidden bg-card">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="w-10 h-10 rounded-xl hover:bg-muted transition-colors flex items-center justify-center"
              aria-label="Меню"
            >
              {mobileOpen ? <X className="w-5 h-5 text-muted-foreground" /> : <Menu className="w-5 h-5 text-muted-foreground" />}
            </button>
            <span className="ml-3 font-bold text-foreground">МатТренер</span>
          </header>
        ) : null}

        {/* Desktop trigger (expand when collapsed) */}
        {collapsed ? (
          <div className="hidden md:flex absolute top-3 left-4 z-40 items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsedAndPersist(false)}
              className="bg-card shadow-sm border border-border rounded-xl p-2 hover:bg-muted transition-colors"
              aria-label="Развернуть меню"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        ) : null}

        <main className="flex-1">{props.children}</main>
      </div>
    </div>
  );
}

