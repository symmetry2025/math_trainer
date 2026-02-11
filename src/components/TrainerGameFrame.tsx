'use client';

import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { cn } from '../lib/utils';

export function TrainerGameFrame(props: {
  header?: ReactNode;
  progressPct?: number; // 0..100
  opponentProgressPct?: number; // 0..100 (race mode)
  opponentLabel?: ReactNode; // e.g. "Соперник: Знаток"
  selfLabel?: ReactNode; // e.g. "Ты"
  children: ReactNode;
  className?: string;
  progressWrapperClassName?: string;
}) {
  const pct = Number.isFinite(props.progressPct) ? Math.max(0, Math.min(100, Math.round(props.progressPct || 0))) : null;
  const oppPct = Number.isFinite(props.opponentProgressPct)
    ? Math.max(0, Math.min(100, Math.round(props.opponentProgressPct || 0)))
    : null;

  const fitOuterRef = useRef<HTMLDivElement | null>(null);
  const fitInnerRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const outer = fitOuterRef.current;
    const inner = fitInnerRef.current;
    if (!outer || !inner) return;

    let raf = 0;
    const compute = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) {
          setFit(null);
          return;
        }
        const avail = outer.clientHeight;
        const needed = inner.scrollHeight;
        if (!Number.isFinite(avail) || !Number.isFinite(needed) || avail <= 0 || needed <= 0) {
          setFit(null);
          return;
        }
        if (needed <= avail + 2) {
          setFit(null);
          return;
        }
        const raw = avail / needed;
        const scale = Math.min(1, Math.max(0.58, Math.floor(raw * 1000) / 1000));
        const height = Math.max(0, Math.floor(needed * scale));
        setFit(scale < 1 ? { scale, height } : null);
      });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(outer);
    ro.observe(inner);
    window.addEventListener('resize', compute);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col min-h-[100svh] px-4 pb-4 md:p-6',
        props.header ? 'pt-0' : 'pt-4',
        props.className,
      )}
    >
      {props.header ? <div className="mb-4 md:mb-5">{props.header}</div> : null}

      {pct !== null ? (
        <div className={props.progressWrapperClassName}>
          {oppPct !== null ? (
            <div className="mb-7 space-y-2">
              <div className="text-center text-sm text-muted-foreground">{props.opponentLabel ?? 'Соперник'}</div>
              <div className="progress-bar">
                <div className="h-full rounded-full transition-all duration-500 ease-out bg-muted-foreground/35" style={{ width: `${oppPct}%` }} />
              </div>
              <div className="text-center text-sm text-muted-foreground">{props.selfLabel ?? 'Ты'}</div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : (
            <div className="progress-bar mb-7">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      ) : null}

      <div ref={fitOuterRef} className="flex-1 min-h-0 overflow-hidden flex flex-col justify-start md:justify-center">
        <div className="w-full flex justify-center" style={fit ? { height: `${fit.height}px` } : undefined}>
          <div
            ref={fitInnerRef}
            className="w-full"
            style={fit ? { transform: `scale(${fit.scale})`, transformOrigin: 'top center' } : undefined}
          >
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
}

