'use client';

import { RotateCcw, Trophy, XCircle } from 'lucide-react';

import type { SessionResult } from '../types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';

function formatTime(seconds: number | undefined): string {
  const s = Math.max(0, Math.floor(Number(seconds || 0)));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}с`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function TrainerResultCard(props: {
  title: string;
  presetId: string;
  presetTitle: string;
  result: SessionResult;
  canGoNext: boolean;
  nextPresetTitle?: string | null;
  onNextLevel: () => void;
  onRetry: () => void;
  onBackToSelect: () => void;
}) {
  const { success, metrics } = props.result;
  const correct = metrics.correct ?? undefined;
  const total = metrics.total ?? undefined;
  const solved = metrics.solved ?? undefined;
  const mistakes = metrics.mistakes ?? undefined;
  const timeSec = metrics.timeSec ?? undefined;
  const stars = metrics.starsEarned ?? undefined;

  const isRace = String(props.presetId || '').startsWith('race:');
  const isAccuracy = props.presetId === 'accuracy' || props.presetId === 'accuracy-input' || props.presetId === 'lvl2';
  const starsAwarded = (() => {
    if (!success) return undefined;
    if (isRace) {
      const n = Math.max(1, Math.min(3, Math.floor(Number(String(props.presetId).split(':')[1] || 0))));
      return typeof stars === 'number' ? stars : n || undefined;
    }
    if (isAccuracy) return typeof stars === 'number' ? stars : 1;
    return typeof stars === 'number' ? stars : undefined;
  })();

  return (
    <div className="card-elevated p-6 md:p-8 text-center space-y-6 animate-scale-in">
      <div className={cn('w-20 h-20 mx-auto rounded-full flex items-center justify-center', success ? 'bg-success/20' : 'bg-destructive/20')}>
        {success ? <Trophy className="w-10 h-10 text-success" /> : <XCircle className="w-10 h-10 text-destructive" />}
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">{props.title}</h2>
        <div className="text-sm md:text-base font-semibold text-muted-foreground">{props.presetTitle}</div>
        <p className={cn('text-lg font-semibold', success ? 'text-success' : 'text-destructive')}>{success ? 'Успех!' : 'Не получилось'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {typeof correct === 'number' && typeof total === 'number' ? (
          <div className="p-4 rounded-2xl bg-muted/50">
            <div className="text-2xl font-bold tabular-nums">
              {correct}/{total}
            </div>
            <div className="text-sm text-muted-foreground">Верно</div>
          </div>
        ) : typeof solved === 'number' && typeof total === 'number' ? (
          <div className="p-4 rounded-2xl bg-muted/50">
            <div className="text-2xl font-bold tabular-nums">
              {solved}/{total}
            </div>
            <div className="text-sm text-muted-foreground">Решено</div>
          </div>
        ) : null}

        {typeof mistakes === 'number' ? (
          <div className={cn('p-4 rounded-2xl', mistakes === 0 ? 'bg-success/10' : 'bg-destructive/10')}>
            <div className="text-2xl font-bold tabular-nums">{mistakes}</div>
            <div className="text-sm text-muted-foreground">Ошибок</div>
          </div>
        ) : null}

        {typeof timeSec === 'number' ? (
          <div className="p-4 rounded-2xl bg-primary/10">
            <div className="text-2xl font-bold tabular-nums">{formatTime(timeSec)}</div>
            <div className="text-sm text-muted-foreground">Время</div>
          </div>
        ) : null}

        {typeof starsAwarded === 'number' ? (
          <div className="p-4 rounded-2xl bg-accent/10">
            <div className="text-2xl font-bold tabular-nums">{starsAwarded}</div>
            <div className="text-sm text-muted-foreground">Звёзды</div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {success ? (
          props.canGoNext ? (
            <Button size="lg" onClick={props.onNextLevel} className="w-full">
              {props.nextPresetTitle ? `К уровню: «${props.nextPresetTitle}»` : 'Следующий уровень'}
            </Button>
          ) : null
        ) : (
          <Button size="lg" onClick={props.onRetry} className="w-full">
            <RotateCcw className="w-5 h-5" />
            Ещё раз
          </Button>
        )}

        <Button variant="outline" size="lg" onClick={props.onBackToSelect} className="w-full">
          К выбору уровня
        </Button>
      </div>
    </div>
  );
}

