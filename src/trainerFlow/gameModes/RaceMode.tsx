'use client';

import { useEffect, useRef, useState } from 'react';

interface RaceModeProps {
  totalProblems: number;
  solvedProblems: number;
  mistakes: number;
  npcSecondsPerProblem: number; // секунд на один пример у NPC
  opponentLevel: number; // 1..3 (уровень противника = звёзды)
  opponentName: string;
  isGameComplete: boolean;
  onRaceEnd: (playerWon: boolean, stars: number) => void;
  /** Optional channel for external HUDs (TrainerGameFrame). */
  onOpponentProgressPct?: (pct: number) => void;
  /** Hide the built-in race HUD. Useful when wrapped by TrainerGameFrame. */
  hideHud?: boolean;
  children: React.ReactNode;
}

export function RaceMode({
  totalProblems,
  solvedProblems,
  mistakes,
  npcSecondsPerProblem,
  opponentLevel,
  opponentName,
  isGameComplete,
  onRaceEnd,
  onOpponentProgressPct,
  hideHud = false,
  children,
}: RaceModeProps) {
  const [npcSolved, setNpcSolved] = useState(0);
  const [raceEnded, setRaceEnded] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const playerProgress = Math.round((solvedProblems / totalProblems) * 100);
  const npcProgress = Math.round((npcSolved / totalProblems) * 100);

  useEffect(() => {
    // Reset between runs (TrainerFlow typically remounts, but keep it robust).
    setNpcSolved(0);
    setRaceEnded(false);
  }, [totalProblems, npcSecondsPerProblem, opponentLevel, opponentName]);

  useEffect(() => {
    if (!onOpponentProgressPct) return;
    onOpponentProgressPct(npcProgress);
  }, [onOpponentProgressPct, npcProgress]);

  useEffect(() => {
    if (raceEnded) return;

    const intervalMs = npcSecondsPerProblem * 1000;
    intervalRef.current = window.setInterval(() => {
      setNpcSolved((prev) => Math.min(prev + 1, totalProblems));
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [totalProblems, npcSecondsPerProblem, raceEnded]);

  useEffect(() => {
    if (raceEnded) return;

    if (isGameComplete && solvedProblems >= totalProblems) {
      const won = npcSolved < totalProblems;
      const stars = won ? opponentLevel : 0;

      setRaceEnded(true);

      if (intervalRef.current) clearInterval(intervalRef.current);

      onRaceEnd(won, stars);
      return;
    }

    if (npcSolved >= totalProblems && solvedProblems < totalProblems) {
      setRaceEnded(true);

      if (intervalRef.current) clearInterval(intervalRef.current);

      onRaceEnd(false, 0);
    }
  }, [isGameComplete, solvedProblems, npcSolved, totalProblems, opponentLevel, raceEnded, onRaceEnd]);

  // Embedded-only: result screen is rendered by TrainerFlow.
  if (raceEnded) return <div className="flex flex-col">{children}</div>;

  if (hideHud) {
    return <div className="flex flex-col">{children}</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="bg-card rounded-2xl p-4 mb-6 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Гонка: {solvedProblems}/{totalProblems} примеров
          </span>
          <div className="flex items-center gap-1">
            {[...Array(opponentLevel)].map((_, i) => (
              <span key={i} className="text-warning">
                ★
              </span>
            ))}
            <span className="text-sm font-medium text-foreground ml-1">{opponentName}</span>
          </div>
        </div>

        <div className="relative h-16 bg-muted rounded-xl overflow-hidden">
          <div className="absolute top-1 left-0 right-0 h-6 bg-primary/10 rounded-lg mx-1">
            <div className="absolute top-0 left-0 h-full bg-primary/30 rounded-lg transition-all duration-300" style={{ width: `${playerProgress}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-4 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground transition-all duration-300 shadow-lg"
              style={{ left: `calc(${Math.min(playerProgress, 95)}% - 16px)` }}
            >
              Ты
            </div>
          </div>

          <div className="absolute bottom-1 left-0 right-0 h-6 bg-destructive/10 rounded-lg mx-1">
            <div className="absolute top-0 left-0 h-full bg-destructive/30 rounded-lg transition-all duration-150" style={{ width: `${npcProgress}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-4 bg-destructive rounded-full flex items-center justify-center text-xs font-bold text-destructive-foreground transition-all duration-150 shadow-lg"
              style={{ left: `calc(${Math.min(npcProgress, 95)}% - 16px)` }}
            >
              🤖
            </div>
          </div>

          <div className="absolute right-2 top-0 bottom-0 w-1 bg-foreground" />
        </div>
      </div>

      {children}
    </div>
  );
}

