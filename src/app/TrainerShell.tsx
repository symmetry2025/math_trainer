'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { BarChart3, Calculator, ChevronRight, CreditCard, Divide, Home, LogOut, Menu, Minus, Orbit, Plus, Rocket, Settings, Star, Trophy, User, Users, X } from 'lucide-react';

import { cn } from '../lib/utils';
import { useStars } from '../lib/useStars';

type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authed'; user: { id: string; email?: string | null; role?: string | null; displayName?: string | null } }
  | { status: 'error' };

function roleRu(role: string | null | undefined): string {
  const r = String(role || '').trim();
  if (r === 'parent') return 'Родитель';
  if (r === 'student') return 'Ученик';
  if (r === 'admin') return 'Админ';
  if (r === 'promoter') return 'Промоутер';
  return r || '—';
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
  const { totalStars } = useStars();

  const galaxyBgClass = useMemo(() => {
    // Пока примеряем только зелёную галактику (сложение).
    if (
      pathname === '/addition' ||
      pathname.startsWith('/addition/') ||
      /^\/class-\d+\/addition(\/|$)/.test(pathname)
    ) {
      return 'space-bg-green';
    }
    return null;
  }, [pathname]);

  const [isDesktop, setIsDesktop] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Космическая тема: в режиме тренажёров всегда dark.
    document.documentElement.classList.add('dark');

    const mq = window.matchMedia('(min-width: 1024px)');
    const applyDesktop = () => {
      const desktop = !!mq.matches;
      setIsDesktop(desktop);
      if (!desktop) setCollapsed(false);
    };
    applyDesktop();

    try {
      mq.addEventListener('change', applyDesktop);
    } catch {
      // ignore
    }

    const c = getInitialCollapsed();
    setCollapsed(mq.matches ? c : false);

    return () => {
      try {
        mq.removeEventListener('change', applyDesktop);
      } catch {
        // ignore
      }
    };
  }, []);

  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const isAdmin = auth.status === 'authed' && auth.user.role === 'admin';
  const isPromoter = auth.status === 'authed' && auth.user.role === 'promoter';
  const isParent = auth.status === 'authed' && auth.user.role === 'parent';
  const isStudent = auth.status === 'authed' && auth.user.role === 'student';
  const authReady = auth.status !== 'loading';
  const useBottomNav = authReady && isStudent;
  const showSidebar = authReady && !useBottomNav;
  const cabinetHref = isAdmin ? '/admin/users' : isPromoter ? '/promoter' : '/settings';
  const settingsHref = '/settings';
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
            displayName: typeof user?.displayName === 'string' ? user.displayName : null,
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

  useEffect(() => {
    if (auth.status !== 'authed') return;
    const now = Date.now();
    const key = 'smmtry.lastSeenPingAt';
    let last = 0;
    try {
      last = Number(window.localStorage.getItem(key) || '0') || 0;
    } catch {
      // ignore
    }
    // Ping at most once per minute (covers "last visit to cabinet" without chatty writes).
    if (now - last < 60_000) return;
    try {
      window.localStorage.setItem(key, String(now));
    } catch {
      // ignore
    }
    fetch('/api/auth/ping', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => undefined);
  }, [auth.status, pathname]);

  type ParentChild = { userId: string; displayName: string | null; email: string | null };
  const [parentChild, setParentChild] = useState<ParentChild | null>(null);

  useEffect(() => {
    if (!isParent) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/parent/children', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { accept: 'application/json' } });
        const body: any = await res.json().catch(() => null);
        if (cancelled) return;
        const list = Array.isArray(body?.children) ? body.children : [];
        const first = list?.[0];
        const next: ParentChild | null =
          first && typeof first.userId === 'string'
            ? { userId: String(first.userId), displayName: typeof first.displayName === 'string' ? first.displayName : null, email: typeof first.email === 'string' ? first.email : null }
            : null;
        setParentChild(next);
      } catch {
        if (cancelled) return;
        setParentChild(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isParent]);

  const trainerNav = useMemo(
    () => [
      {
        grade: 2,
        label: '2 класс',
        hrefDefault: '/class-2/addition',
        items: [
          { label: 'Сложение', href: '/class-2/addition', icon: Plus },
          { label: 'Вычитание', href: '/class-2/subtraction', icon: Minus },
          { label: 'Умножение', href: '/class-2/multiplication', icon: Calculator },
          { label: 'Деление', href: '/class-2/division', icon: Divide },
        ],
      },
      {
        grade: 3,
        label: '3 класс',
        hrefDefault: '/class-3/addition',
        items: [
          { label: 'Сложение', href: '/class-3/addition', icon: Plus },
          { label: 'Вычитание', href: '/class-3/subtraction', icon: Minus },
          { label: 'Умножение', href: '/class-3/multiplication', icon: Calculator },
          { label: 'Деление', href: '/class-3/division', icon: Divide },
        ],
      },
      {
        grade: 4,
        label: '4 класс',
        hrefDefault: '/class-4/addition',
        items: [
          { label: 'Сложение', href: '/class-4/addition', icon: Plus },
          { label: 'Вычитание', href: '/class-4/subtraction', icon: Minus },
          { label: 'Умножение', href: '/class-4/multiplication', icon: Calculator },
          { label: 'Деление', href: '/class-4/division', icon: Divide },
        ],
      },
    ],
    [],
  );

  const progressNav = useMemo(
    () => [
      { group: 'Прогресс', label: 'Мои достижения', href: '/progress/achievements', icon: Trophy },
      { group: 'Прогресс', label: 'Статистика', href: '/progress/stats', icon: BarChart3 },
    ],
    [],
  );

  const parentChildNav = useMemo(() => {
    const childId = (parentChild?.userId || '').trim();
    const q = childId ? `?childId=${encodeURIComponent(childId)}` : '';
    return [
      { label: 'Достижения', href: '/progress/achievements' + q, icon: Trophy },
      { label: 'Статистика', href: '/progress/stats' + q, icon: BarChart3 },
    ];
  }, [parentChild?.userId]);

  const promoterNav = useMemo(
    () => [
      { group: 'Промоутер', label: 'Кабинет', href: '/promoter', icon: Users },
    ],
    [],
  );

  const adminNav = useMemo(
    () => [
      { group: 'Админка', label: 'Пользователи', href: '/admin/users', icon: Users },
      { group: 'Админка', label: 'Промоутеры', href: '/admin/promoters', icon: Users },
      { group: 'Админка', label: 'Подписки', href: '/admin/subscriptions', icon: CreditCard },
    ],
    [],
  );

  const [openGrade, setOpenGrade] = useState<2 | 3 | 4 | null>(2);

  const activeHref = useMemo(() => {
    const hrefs: string[] = [];
    if (!isAdmin && !isPromoter && !isParent) {
      hrefs.push('/home');
      for (const g of trainerNav) for (const i of g.items) hrefs.push(i.href);
      for (const p of progressNav) hrefs.push(p.href);
    }
    if (isParent) {
      for (const p of parentChildNav) hrefs.push(p.href.split('?')[0] || p.href);
    }
    if (isPromoter) for (const p of promoterNav) hrefs.push(p.href);
    for (const a of adminNav) hrefs.push(a.href);
    hrefs.sort((a, b) => b.length - a.length);
    for (const href of hrefs) {
      if (pathname === href || pathname.startsWith(href + '/')) return href;
    }
    return null;
  }, [trainerNav, progressNav, promoterNav, adminNav, pathname, isAdmin, isPromoter]);

  const hideMobileHeader = useMemo(() => {
    // Hide ONLY on a concrete trainer page (e.g. /addition/<exerciseId>), because TrainerFlow provides its own header there.
    return (
      /^\/addition\/.+/.test(pathname) ||
      /^\/subtraction\/.+/.test(pathname) ||
      /^\/multiplication\/.+/.test(pathname) ||
      /^\/division\/.+/.test(pathname) ||
      /^\/class-\d+\/(addition|subtraction|multiplication|division)\/.+/.test(pathname) ||
      /^\/trainers\/.+/.test(pathname)
    );
  }, [pathname]);

  const setCollapsedAndPersist = (next: boolean) => {
    if (!isDesktop) return;
    setCollapsed(next);
    try {
      window.localStorage.setItem('smmtry_trainer_sidebar', next ? 'collapsed' : 'expanded');
    } catch {
      // ignore
    }
  };

  const galaxyHref = useMemo(() => {
    // "Галактика" = список планет/блоков текущей операции и класса, если мы уже внутри.
    const m = pathname.match(/^\/(class-(2|3|4))\/(addition|subtraction|multiplication|division)(\/|$)/);
    if (m) return `/${m[1]}/${m[3]}`;
    return '/home';
  }, [pathname]);

  const bottomActiveKey = useMemo(() => {
    if (pathname === '/home' || pathname.startsWith('/home/')) return 'home';
    if (pathname.startsWith('/progress/achievements')) return 'achievements';
    if (pathname.startsWith('/progress/stats')) return 'stats';
    if (pathname.startsWith('/settings')) return 'settings';
    if (/^\/class-\d+\/(addition|subtraction|multiplication|division)(\/|$)/.test(pathname)) return 'galaxy';
    return null;
  }, [pathname]);

  return (
    <div
      className={cn('min-h-screen flex w-full space-sky overflow-x-hidden', galaxyBgClass)}
      style={
        {
          // Used by CenteredOverlay to center "Saving..." relative to the working area (excluding sidebar on md+).
          '--smmtry-sidebar-w': showSidebar && isDesktop ? (collapsed ? '4rem' : '16rem') : '0rem',
          '--smmtry-bottom-nav-h': useBottomNav ? '184px' : '0px',
        } as any
      }
    >
      {/* Mobile overlay */}
      {showSidebar && mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      {showSidebar ? (
        <aside
          className={cn(
            'z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
            'fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:h-screen overflow-y-auto',
            isDesktop && collapsed ? 'w-16' : 'w-64',
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
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
          {!isAdmin && !isPromoter && !isParent ? (
            <div className="mb-4">
              {/* Home */}
              <div className="mb-3">
                <Link
                  href="/home"
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? 'Домой' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-sidebar-accent',
                    activeHref === '/home' && 'bg-sidebar-accent text-sidebar-primary font-semibold',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  {pathname === '/home' ? <Home className="w-5 h-5 flex-shrink-0" /> : <Rocket className="w-5 h-5 flex-shrink-0" />}
                  {!collapsed ? <span className="truncate">Домой</span> : null}
                  {!collapsed && activeHref === '/home' ? <ChevronRight className="w-4 h-4 ml-auto text-sidebar-primary" /> : null}
                </Link>
              </div>

              <div className="space-y-1">
                {trainerNav.map((g) => {
                  const isOpen = openGrade === (g.grade as any);
                  const anyActive = g.items.some((i) => i.href === activeHref);

                  if (collapsed) {
                    return (
                      <Link
                        key={g.grade}
                        href={g.hrefDefault}
                        title={g.label}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center justify-center px-2 py-2 rounded-xl transition-all hover:bg-sidebar-accent',
                          anyActive && 'bg-sidebar-accent text-sidebar-primary font-semibold',
                        )}
                      >
                        <span className="w-10 h-10 rounded-xl bg-sidebar-accent/50 flex items-center justify-center text-sm font-extrabold tabular-nums">
                          {g.grade}
                        </span>
                      </Link>
                    );
                  }

                  return (
                    <div key={g.grade} className="rounded-xl">
                      <button
                        type="button"
                        onClick={() => setOpenGrade((p) => (p === (g.grade as any) ? null : (g.grade as any)))}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-sidebar-accent text-left',
                          anyActive && 'bg-sidebar-accent/70',
                        )}
                      >
                        <span
                          className={cn(
                            'w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center font-extrabold tabular-nums',
                            anyActive && 'text-sidebar-primary',
                          )}
                        >
                          {g.grade}
                        </span>
                        <span className={cn('truncate', anyActive && 'font-semibold')}>{g.label}</span>
                        <ChevronRight className={cn('w-4 h-4 ml-auto text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
                      </button>

                      {isOpen ? (
                        <div className="mt-1 ml-11 space-y-1">
                          {g.items.map((item) => {
                            const Icon = item.icon;
                            const active = item.href === activeHref;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-sidebar-accent',
                                  active && 'bg-sidebar-accent text-sidebar-primary font-semibold',
                                )}
                              >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!isAdmin && !isPromoter && !isParent ? <div className="mb-4">
            <div className="space-y-1">
              {progressNav.map((item) => {
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
          </div> : null}

          {isParent ? (
            <div className="mb-4">
              {!collapsed ? (
                <div className="px-3 py-2">
                  <div className="text-xs text-muted-foreground">Ребёнок</div>
                  <div className="text-sm font-semibold text-sidebar-foreground truncate">
                    {(parentChild?.displayName || '').trim() || parentChild?.email || 'Не привязан'
                    }
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                {parentChildNav.map((item) => {
                  const Icon = item.icon;
                  const active = (item.href.split('?')[0] || item.href) === activeHref;
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
          ) : null}

          {isPromoter ? (
            <div className="mb-4">
              <div className="space-y-1">
                {promoterNav.map((item) => {
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
          ) : null}

          {isAdmin ? (
            <div className="mb-4">
              <div className="space-y-1">
                {adminNav.map((item) => {
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
          ) : null}
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

              <a
                className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
                href={auth.status === 'authed' ? cabinetHref : '/login'}
                title={auth.status === 'authed' ? 'Аккаунт' : 'Войти'}
              >
                <User className="w-5 h-5 text-brand-dark-foreground" />
              </a>

              {auth.status === 'authed' ? (
                <Link
                  className="w-10 h-10 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-center"
                  href={settingsHref}
                  title="Настройки"
                  onClick={() => setMobileOpen(false)}
                >
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </Link>
              ) : null}

              {auth.status === 'authed' && !isAdmin && !isPromoter && !isStudent ? (
                <Link
                  className="w-10 h-10 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-center"
                  href="/billing"
                  title="Подписка"
                  onClick={() => setMobileOpen(false)}
                >
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </Link>
              ) : null}

              {!isPromoter ? (
                <div className="w-10 h-10 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-center" title={`Звёзды: ${totalStars}`}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-sidebar-foreground">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="tabular-nums">{totalStars}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-brand-dark-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {auth.status === 'authed'
                      ? (auth.user.displayName || '').trim() || auth.user.email || auth.user.id
                      : auth.status === 'loading'
                        ? 'Загрузка…'
                        : 'Гость'}
                  </p>
                  {auth.status === 'authed' ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate">{roleRu(auth.user.role)}</p>
                      {!isPromoter ? (
                        <div className="ml-auto inline-flex items-center gap-1 rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-semibold text-sidebar-foreground" title="Звёзды">
                          <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                          <span className="tabular-nums">{totalStars}</span>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={doLogout}
                        className={cn(
                          'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors',
                          isPromoter && 'ml-auto',
                        )}
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

                {isDesktop ? (
                  <button
                    type="button"
                    onClick={() => setCollapsedAndPersist(true)}
                    className="w-10 h-10 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-center"
                    aria-label="Свернуть меню"
                  >
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ) : null}
              </div>

              {auth.status === 'authed' ? (
                <Link
                  href={settingsHref}
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-sidebar-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <Settings className="w-4 h-4" />
                  Настройки
                </Link>
              ) : null}

              {auth.status === 'authed' && !isAdmin && !isPromoter && !isStudent ? (
                <Link
                  href="/billing"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-sidebar-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <CreditCard className="w-4 h-4" />
                  Подписка
                </Link>
              ) : null}
            </>
          )}
        </div>
      </aside>
      ) : null}

      <div className={cn('flex-1 flex flex-col min-w-0 relative', useBottomNav && 'pb-[var(--smmtry-bottom-nav-h)]')}>
        {/* Mobile header */}
        {showSidebar && !hideMobileHeader ? (
          <header className="h-14 flex items-center border-b border-border px-4 lg:hidden bg-card sticky top-0 z-40">
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
        {showSidebar && collapsed && isDesktop ? (
          <div className="hidden lg:flex absolute top-3 left-4 z-40 items-center gap-2">
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

      {useBottomNav ? (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="relative w-full">
            {/* Underlay base (full width, shorter height) */}
            <div className="w-full bg-neutral-900/55 backdrop-blur-md border-t border-white/10 shadow-[0_-8px_60px_rgba(0,0,0,0.55)] rounded-t-[36px] pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <div className="h-[72px] md:h-[80px]" />
            </div>

            {/* Screen (panel image) protruding above the base */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-0 -translate-y-[64px]"
              style={{ width: 'min(calc(92vw * 1.05), calc(760px * 1.05))' }}
            >
              <div className="relative h-[168px] md:h-[182px]">
                {/* Panel image */}
                <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
                  <img src="/ui/panel-bar.png" alt="" aria-hidden="true" className="w-full h-full object-contain" draggable={false} />
                </div>

                {/* Icons layer */}
                <div className="relative z-10 h-full grid grid-cols-5 place-items-center px-8 pt-6 pb-5">
                  {[
                    {
                      key: 'stats' as const,
                      label: 'Статистика',
                      href: '/progress/stats',
                      iconSrc: '/icons/bottom-nav/book-stat-inactive.png',
                      iconActiveSrc: '/icons/bottom-nav/book-stat.png',
                      big: true,
                    },
                    {
                      key: 'home' as const,
                      label: 'Домой',
                      href: '/home',
                      iconSrc: '/icons/bottom-nav/rocket-inacitve.png',
                      iconActiveSrc: '/icons/bottom-nav/rocket.png',
                      big: true,
                    },
                    {
                      key: 'galaxy' as const,
                      label: 'Галактика',
                      href: galaxyHref,
                      iconSrc: '/icons/bottom-nav/map-inactive.png',
                      iconActiveSrc: '/icons/bottom-nav/map.png',
                      big: true,
                    },
                    {
                      key: 'achievements' as const,
                      label: 'Достижения',
                      href: '/progress/achievements',
                      iconSrc: '/icons/bottom-nav/trophy-inactive.png',
                      iconActiveSrc: '/icons/bottom-nav/trophy.png',
                    },
                    {
                      key: 'settings' as const,
                      label: 'Настройки',
                      href: '/settings',
                      // У этого набора файлов цвета "active/inactive" перепутаны относительно названия.
                      iconSrc: '/icons/bottom-nav/settings.png',
                      iconActiveSrc: '/icons/bottom-nav/settings-inactive.png',
                      big: true,
                    },
                  ].map((item) => {
                    const active = bottomActiveKey === item.key;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 transition-opacity',
                          active ? 'opacity-100' : 'opacity-70 hover:opacity-100',
                        )}
                        aria-current={active ? 'page' : undefined}
                        aria-label={item.label}
                      >
                        <img
                          src={active ? item.iconActiveSrc : item.iconSrc}
                          alt=""
                          aria-hidden="true"
                          className={item.big ? 'w-[62px] h-[62px]' : 'w-12 h-12'}
                          draggable={false}
                        />
                        {active ? (
                          <span className="text-[12px] leading-none font-semibold text-foreground">{item.label}</span>
                        ) : (
                          <span aria-hidden="true" className="h-[12px]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

