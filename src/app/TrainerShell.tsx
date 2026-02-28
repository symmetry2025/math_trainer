'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { BarChart3, Calculator, ChevronRight, CreditCard, Divide, Home, LogOut, Menu, Minus, Orbit, Plus, Rocket, Settings, Signal, Star, Trophy, User, Users, X } from 'lucide-react';

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

  const [lastGalaxyHref, setLastGalaxyHref] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'smmtry.lastGalaxyHref';

    const update = () => {
      const p = window.location.pathname || '/';
      const href = `${p}${window.location.search || ''}${window.location.hash || ''}`;
      const isGalaxy = /^\/class-\d+\/(addition|subtraction|multiplication|division)(\/|$)/.test(p);

      if (isGalaxy) {
        try {
          window.localStorage.setItem(key, href);
        } catch {
          // ignore
        }
        setLastGalaxyHref(href);
        return;
      }

      try {
        setLastGalaxyHref(window.localStorage.getItem(key));
      } catch {
        setLastGalaxyHref(null);
      }
    };

    update();
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('hashchange', update);
    };
  }, [pathname]);

  const galaxyNavHref = useMemo(() => {
    const v = (lastGalaxyHref || '').trim();
    if (v.startsWith('/class-')) return v;
    return galaxyHref;
  }, [galaxyHref, lastGalaxyHref]);

  const bottomActiveKey = useMemo(() => {
    if (pathname === '/home' || pathname.startsWith('/home/')) return 'home';
    if (pathname.startsWith('/progress/achievements')) return 'achievements';
    if (pathname.startsWith('/progress/stats')) return 'stats';
    if (pathname.startsWith('/settings')) return 'settings';
    if (/^\/class-\d+\/(addition|subtraction|multiplication|division)(\/|$)/.test(pathname)) return 'galaxy';
    return null;
  }, [pathname]);

  const bottomNavItems = useMemo(
    () => [
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
        href: galaxyNavHref,
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
    ],
    [galaxyNavHref],
  );

  const [bottomPressedKey, setBottomPressedKey] = useState<string | null>(null);
  useEffect(() => {
    setBottomPressedKey(null);
  }, [pathname]);

  const bottomIndicatorKey = bottomPressedKey ?? bottomActiveKey;
  const bottomIndicatorIndex = useMemo(() => {
    if (!bottomIndicatorKey) return -1;
    return bottomNavItems.findIndex((x) => x.key === bottomIndicatorKey);
  }, [bottomIndicatorKey, bottomNavItems]);

  const bottomIconsLayerRef = useRef<HTMLDivElement | null>(null);
  const bottomItemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const bottomIndicatorSideRef = useRef<number>(0);
  const [bottomIndicator, setBottomIndicator] = useState<{ x: number; y: number; w: number; h: number; visible: boolean }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    visible: false,
  });

  const [statusTime, setStatusTime] = useState(() => {
    const d = new Date();
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(d);
  });

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const tick = () => setStatusTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    if (!useBottomNav) return;
    // Recompute on mount/resize (e.g., font load / viewport changes).
    bottomIndicatorSideRef.current = 0;
    const layer = bottomIconsLayerRef.current;
    const el = bottomItemRefs.current[bottomIndicatorIndex] || null;
    if (!layer || !el || bottomIndicatorIndex < 0) {
      setBottomIndicator((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }

    const update = () => {
      const layerRect = layer.getBoundingClientRect();
      const targetRect = el.getBoundingClientRect();

      // Keep the indicator size constant across items; derive once from the largest item.
      let side = bottomIndicatorSideRef.current || 0;
      if (!side) {
        let maxW = 0;
        let maxH = 0;
        for (const a of bottomItemRefs.current) {
          if (!a) continue;
          const r = a.getBoundingClientRect();
          maxW = Math.max(maxW, r.width);
          maxH = Math.max(maxH, r.height);
        }
        const base = Math.max(maxW, maxH);
        // +1.2x to fit "Достижения" and keep a roomy, phone-like selection square.
        side = Math.ceil(base * 1.2);
        bottomIndicatorSideRef.current = side;
      }

      const x = targetRect.left - layerRect.left + (targetRect.width - side) / 2;
      const y = targetRect.top - layerRect.top + (targetRect.height - side) / 2;
      setBottomIndicator({ x, y, w: side, h: side, visible: true });
    };

    update();
    const onResize = () => {
      bottomIndicatorSideRef.current = 0;
      update();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [useBottomNav, bottomIndicatorIndex]);

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

      {useBottomNav && galaxyBgClass === 'space-bg-green' ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[40vh] space-dust-green-top"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[75vh] space-dust-green-bottom"
          />
        </>
      ) : null}

      {useBottomNav ? (
        <nav className="fixed bottom-0 left-0 right-0 z-50 overflow-visible">
          <div className="relative w-full overflow-visible">
            {/* Base underlay (slightly inset from edges) */}
            <div className="relative z-0 px-4 md:px-8 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] h-[116px] md:h-[120px]">
              <div className="relative h-full mx-auto max-w-6xl">
                {/* Push base down so bottom edge is not visible */}
                <div className="dash-base absolute inset-x-0 -bottom-[44px] h-[100px] md:h-[100px]" />
              </div>
            </div>

            {/* Screen overlay (centered, shifted up like a car dash) */}
            <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+12px)] -translate-y-[6px] w-[min(92vw,48rem)]">
              <div className="dash-screen animate-dash-enter h-[184px] md:h-[196px] shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
                {/* Decorative iPhone-like status bar */}
                <div
                  className="animate-dash-fade pointer-events-none absolute right-6 top-4 z-20 flex items-center gap-2 text-[11px] font-semibold text-white/80"
                  style={{ animationDelay: '220ms' }}
                >
                  <span className="tabular-nums">{statusTime}</span>
                  <span className="text-[9px] tracking-wide text-white/70">LTE</span>
                  <Signal className="w-3.5 h-3.5 text-white/75" />
                </div>

                {/* Icons */}
                <div
                  ref={bottomIconsLayerRef}
                  className="animate-dash-fade relative z-10 h-full grid grid-cols-5 place-items-center px-6 pt-8 pb-5"
                  style={{ animationDelay: '280ms' }}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute left-0 top-0 z-0',
                      'rounded-2xl bg-white/10 border border-white/15',
                      'shadow-[0_10px_28px_rgba(0,0,0,0.45)]',
                      'transition-transform duration-300 ease-out',
                      bottomIndicator.visible ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{
                      width: `${bottomIndicator.w}px`,
                      height: `${bottomIndicator.h}px`,
                      transform: `translate3d(${bottomIndicator.x}px, ${bottomIndicator.y}px, 0)`,
                      willChange: 'transform',
                    }}
                  />

                  {bottomNavItems.map((item, idx) => {
                    const active = bottomActiveKey === item.key;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        ref={(el) => {
                          bottomItemRefs.current[idx] = el;
                        }}
                        onClick={() => setBottomPressedKey(item.key)}
                        className={cn(
                          'animate-dash-item pointer-events-auto relative z-10 flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 transition-opacity',
                          active ? 'opacity-100' : 'opacity-70 hover:opacity-100',
                        )}
                        style={{ animationDelay: `${320 + idx * 55}ms` }}
                        aria-current={active ? 'page' : undefined}
                        aria-label={item.label}
                      >
                        <div className="h-[88px] flex items-center justify-center">
                          <img
                            src={active ? item.iconActiveSrc : item.iconSrc}
                            alt=""
                            aria-hidden="true"
                            className={item.big ? 'w-[88px] h-[88px]' : 'w-[68px] h-[68px]'}
                            draggable={false}
                          />
                        </div>
                        <span
                          className={cn(
                            'mt-1 text-[11px] leading-none uppercase tracking-wide',
                            active ? 'font-semibold text-foreground' : 'font-medium text-white/45',
                          )}
                        >
                          {item.label}
                        </span>
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

