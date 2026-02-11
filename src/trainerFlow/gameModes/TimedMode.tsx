'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

import { cn } from '../../lib/utils';

interface TimedModeProps {
  timeLimit: number; // в секундах
  totalProblems: number;
  solvedProblems: number;
  mistakes: number;
  isGameComplete: boolean;
  onTimeEnd: (timeElapsed: number, success: boolean) => void;
  onTick?: (timeRemaining: number) => void;
  /** Hide the built-in HUD (time/progress bars). Useful when wrapped by TrainerGameFrame. */
  hideHud?: boolean;
  children: React.ReactNode;
}

export function TimedMode({
  timeLimit,
  totalProblems,
  solvedProblems,
  mistakes,
  isGameComplete,
  onTimeEnd,
  onTick,
  hideHud = false,
  children,
}: TimedModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [gameEnded, setGameEnded] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset between runs (TrainerFlow typically remounts, but keep it robust).
    setTimeRemaining(timeLimit);
    setGameEnded(false);
  }, [timeLimit]);

  useEffect(() => {
    // Ensure parent receives the initial value immediately.
    onTick?.(timeLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimit]);

  useEffect(() => {
    if (gameEnded) return;

    intervalRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onTick?.(0);
          return 0;
        }
        const next = prev - 1;
        onTick?.(next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameEnded]);

  useEffect(() => {
    if (gameEnded) return;

    // Игрок завершил все примеры
    if (isGameComplete) {
      const elapsed = timeLimit - timeRemaining;
      const didSucceed = elapsed <= timeLimit && solvedProblems >= totalProblems;

      setGameEnded(true);

      if (intervalRef.current) clearInterval(intervalRef.current);

      onTimeEnd(elapsed, didSucceed);
      return;
    }

    // Время вышло
    if (timeRemaining <= 0) {
      setGameEnded(true);
      onTimeEnd(timeLimit, false);
    }
  }, [isGameComplete, timeRemaining, solvedProblems, totalProblems, timeLimit, gameEnded, onTimeEnd]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeProgress = (timeRemaining / timeLimit) * 100;
  const isLowTime = timeRemaining <= 10;
  const problemsProgress = Math.round((solvedProblems / totalProblems) * 100);

  // Embedded-only: result screen is rendered by TrainerFlow.
  if (gameEnded) return <div className="flex flex-col">{children}</div>;

  if (hideHud) {
    return <div className="flex flex-col">{children}</div>;
  }

  return (
    <div className="flex flex-col">
      <div className={cn('bg-card rounded-2xl p-4 mb-6 border transition-colors', isLowTime ? 'border-destructive bg-destructive/5' : 'border-border')}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className={cn('w-5 h-5', isLowTime ? 'text-destructive animate-pulse' : 'text-muted-foreground')} />
            <span className={cn('text-sm font-medium', isLowTime ? 'text-destructive' : 'text-muted-foreground')}>
              {solvedProblems}/{totalProblems} примеров
            </span>
          </div>
          <span className={cn('text-2xl font-bold', isLowTime ? 'text-destructive animate-pulse' : 'text-foreground')}>
            {formatTime(timeRemaining)}
          </span>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div className={cn('h-full transition-all duration-1000 rounded-full', isLowTime ? 'bg-destructive' : 'bg-primary')} style={{ width: `${timeProgress}%` }} />
        </div>

        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-success transition-all duration-300 rounded-full" style={{ width: `${problemsProgress}%` }} />
        </div>
      </div>

      {children}
    </div>
  );
}

