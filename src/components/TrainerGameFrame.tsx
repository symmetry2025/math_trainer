'use client';

import type { ReactNode } from 'react';

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

      <div className="flex-1 min-h-0 flex flex-col justify-start md:justify-center">{props.children}</div>
    </div>
  );
}

