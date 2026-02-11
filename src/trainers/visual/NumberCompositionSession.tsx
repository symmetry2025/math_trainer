'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../../lib/utils';
import type { SessionMetrics } from '../../trainerFlow';
import NumberKeyboard from '../../components/NumberKeyboard';
import { usePhysicalNumberKeyboard } from '../../lib/usePhysicalNumberKeyboard';
import { prepareUniqueList } from '../../lib/uniqueProblems';
import { DrillStage } from '../drill/engine/DrillStage';
import { useDrillEngine } from '../drill/engine/useDrillEngine';
import { RaceMode } from '../../trainerFlow/gameModes';

export type NumberCompositionProblem = {
  sum: number;
  known: number;
  missing: number;
  missingSide: 'left' | 'right';
};

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function makeProblem(args: { minSum: number; maxSum: number }): NumberCompositionProblem {
  const minSum = clampInt(args.minSum, 2, 20, 2);
  const maxSum = clampInt(args.maxSum, minSum, 20, Math.max(minSum, 10));
  const span = Math.max(0, maxSum - minSum);
  const sum = clampInt(minSum + Math.floor(Math.random() * (span + 1)), minSum, maxSum, maxSum);
  const known = clampInt(Math.floor(Math.random() * (sum + 1)), 0, sum, 0);
  const missing = sum - known;
  const missingSide: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
  return { sum, known, missing, missingSide };
}

function makeProblems(args: { minSum: number; maxSum: number; totalProblems: number }): NumberCompositionProblem[] {
  const total = clampInt(args.totalProblems, 1, 50, 10);
  const minSum = clampInt(args.minSum, 2, 20, 2);
  const maxSum = clampInt(args.maxSum, minSum, 20, Math.max(minSum, 10));
  return prepareUniqueList({
    count: total,
    make: () => makeProblem({ minSum, maxSum }),
    keyOf: (p) => `${p.sum}:${p.known}:${p.missingSide}`,
  });
}

export function NumberCompositionSession(props: {
  attemptId?: string;
  minSum: number;
  maxSum: number;
  totalProblems: number;
  level: 'accuracy-choice' | 'accuracy-input' | 'speed' | 'race';
  starLevel?: 1 | 2 | 3;
  timeLimitSec?: number;
  npcSecondsPerProblem?: number;
  setMetrics?: (m: SessionMetrics) => void;
  onFinish: (result: {
    correct: number;
    solved: number;
    total: number;
    mistakes: number;
    timeSec: number;
    won?: boolean;
    starsEarned?: 0 | 1 | 2 | 3;
  }) => void;
}) {
  const problems = useMemo(() => {
    // attemptId forces a reshuffle / restart on retry (TrainerFlow changes attemptId).
    void props.attemptId;
    return makeProblems({ minSum: props.minSum, maxSum: props.maxSum, totalProblems: props.totalProblems });
  }, [props.attemptId, props.minSum, props.maxSum, props.totalProblems]);
  const total = problems.length;

  const [inputValue, setInputValue] = useState('');
  const wrongUniqueRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    wrongUniqueRef.current.clear();
    setInputValue('');
  }, [props.attemptId, problems]);

  const isSpeed = props.level === 'speed';
  const isRace = props.level === 'race';
  const [opponentProgressPct, setOpponentProgressPct] = useState(0);
  const totalSeconds = Math.max(1, Math.floor(Number(props.timeLimitSec || 60)));
  const starLevel = (props.starLevel ?? 1) as 1 | 2 | 3;
  const npcSecondsPerProblem = Math.max(1, Number(props.npcSecondsPerProblem || 6));
  const opponentTitle = starLevel === 1 ? 'Новичок' : starLevel === 2 ? 'Знаток' : 'Мастер';

  const finishedRef = useMemo(() => ({ done: false }), []);
  const emitFinishOnce = useCallback(
    (r: Parameters<typeof props.onFinish>[0]) => {
      if (finishedRef.done) return;
      finishedRef.done = true;
      props.onFinish(r);
    },
    [props, finishedRef],
  );

  const playerDoneRef = useMemo(() => ({ done: false, timeSec: 0 }), []);

  const engine = useDrillEngine<NumberCompositionProblem>({
    problems,
    total,
    answerOf: (p) => p.missing,
    attemptPolicy: 'untilCorrect',
    timer: isSpeed ? { mode: 'remaining', totalSeconds, endOnZero: true } : { mode: 'elapsed' },
    wrongResetMs: 600,
    markDelayMs: 350,
    stepMs: 800,
    onFinish: ({ solved, total, mistakes, timeSec, won }) => {
      const solvedNow = Math.max(0, Math.min(total, Math.floor(Number(solved || 0))));
      const correctFirstTry = Math.max(0, solvedNow - wrongUniqueRef.current.size);

      if (isRace) {
        playerDoneRef.done = true;
        playerDoneRef.timeSec = timeSec;
        return;
      }

      const didWin = isSpeed ? (typeof won === 'boolean' ? won : solvedNow >= total) : undefined;
      emitFinishOnce({ correct: correctFirstTry, solved: solvedNow, total, mistakes, timeSec, won: didWin });
    },
  });

  const problem = engine.problem ?? null;

  // IMPORTANT: clear input before paint when switching to next problem,
  // otherwise the next card may briefly show the previous input for 1 frame.
  useLayoutEffect(() => {
    if (engine.selectedAnswer === null && engine.status === null) setInputValue('');
  }, [engine.index, engine.selectedAnswer, engine.status]);

  const handleKeyboardInput = useCallback(
    (value: number) => {
      if (engine.selectedAnswer !== null || !problem) return;
      const next = (inputValue + value.toString()).slice(0, 2);
      setInputValue(next);
      const numValue = Number.parseInt(next, 10);
      const correct = problem.missing;
      if (numValue === correct) {
        engine.submitAnswer(numValue);
      } else if (next.length >= String(correct).length) {
        engine.submitAnswer(numValue);
      }
    },
    [engine, inputValue, problem],
  );

  const handleBackspace = useCallback(() => {
    if (engine.selectedAnswer !== null) return;
    setInputValue((p) => p.slice(0, -1));
  }, [engine.selectedAnswer]);

  usePhysicalNumberKeyboard({
    enabled: engine.selectedAnswer === null,
    onDigit: handleKeyboardInput,
    onBackspace: handleBackspace,
  });

  useEffect(() => {
    if (!problem) return;
    if (engine.status !== 'wrong') return;
    // Track unique wrong problems to compute "first-try" correctness.
    wrongUniqueRef.current.add(engine.index);
  }, [engine.status, engine.index, problem]);

  useEffect(() => {
    if (!props.setMetrics) return;
    const solved = Math.max(0, Math.min(total, engine.correctCount));
    const progressPct = total > 0 ? Math.round((solved / total) * 100) : 0;
    const correctFirstTry = Math.max(0, solved - wrongUniqueRef.current.size);
    const counterCurrent = isRace ? solved : Math.min(total, engine.index + 1);
    props.setMetrics({
      progressPct,
      opponentProgressPct: isRace ? opponentProgressPct : undefined,
      total,
      solved,
      correct: correctFirstTry,
      mistakes: engine.mistakesCount,
      badges: [
        { kind: 'counter', label: 'Пример', current: counterCurrent, total },
        ...(isSpeed && typeof engine.remainingSec === 'number' && typeof engine.totalSeconds === 'number'
          ? ([{ kind: 'time', label: 'Время', seconds: engine.remainingSec, mode: 'remaining', totalSeconds: engine.totalSeconds }] as const)
          : ([{ kind: 'time', label: 'Время', seconds: engine.elapsedSec, mode: 'elapsed' }] as const)),
        { kind: 'mistakes', label: 'Ошибки', value: engine.mistakesCount },
        ...(isRace ? ([{ kind: 'text', label: 'Соперник', value: opponentTitle }] as const) : ([] as const)),
      ],
    });
  }, [props.setMetrics, total, engine.index, engine.correctCount, engine.mistakesCount, engine.elapsedSec, engine.remainingSec, engine.totalSeconds, isSpeed, isRace, opponentProgressPct, opponentTitle]);

  if (!problem) return null;

  const cellBase = 'w-28 h-16 sm:w-32 sm:h-[72px] rounded-2xl border-2 flex items-center justify-center text-3xl sm:text-4xl font-extrabold tabular-nums';

  const content = (
    <div className="w-full">
      <DrillStage
        status={engine.status}
        cardKey={engine.cardKey}
        cardAnimating={engine.cardAnimating}
        card={
          <div className="w-full flex items-center justify-center">
            <div className="relative w-[340px] max-w-full h-[160px] sm:h-[170px]">
              {/* edges */}
              <svg className="absolute inset-0" viewBox="0 0 340 170" fill="none" aria-hidden="true">
                <line x1="170" y1="64" x2="95" y2="108" style={{ stroke: 'hsl(var(--primary))', opacity: 0.35 }} strokeWidth="3" strokeLinecap="round" />
                <line x1="170" y1="64" x2="245" y2="108" style={{ stroke: 'hsl(var(--primary))', opacity: 0.35 }} strokeWidth="3" strokeLinecap="round" />
              </svg>

              {/* top node */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center shadow-sm">
                <div className="text-4xl sm:text-5xl font-extrabold tabular-nums text-foreground">{problem.sum}</div>
              </div>

              {/* bottom cells */}
              <div className="absolute left-0 right-0 bottom-0 flex items-end justify-between px-2">
                <div
                  className={cn(
                    cellBase,
                    'bg-card border-border',
                    // Keep input cell background opaque so the edge line doesn't show through.
                    problem.missingSide === 'left' && 'border-primary/60',
                    engine.status === 'wrong' && problem.missingSide === 'left' && 'border-destructive/60',
                  )}
                >
                  <span className={cn(problem.missingSide === 'left' && !inputValue ? 'text-muted-foreground/60' : 'text-foreground')}>
                    {problem.missingSide === 'left' ? inputValue || '?' : String(problem.known)}
                  </span>
                </div>

                <div
                  className={cn(
                    cellBase,
                    'bg-card border-border',
                    // Keep input cell background opaque so the edge line doesn't show through.
                    problem.missingSide === 'right' && 'border-primary/60',
                    engine.status === 'wrong' && problem.missingSide === 'right' && 'border-destructive/60',
                  )}
                >
                  <span className={cn(problem.missingSide === 'right' && !inputValue ? 'text-muted-foreground/60' : 'text-foreground')}>
                    {problem.missingSide === 'right' ? inputValue || '?' : String(problem.known)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        }
        input={
          <NumberKeyboard
            disabled={engine.selectedAnswer !== null}
            showBackspace={true}
            backspaceEnabled={inputValue.length > 0}
            onBackspace={handleBackspace}
            onInput={(n) => handleKeyboardInput(n)}
          />
        }
      />
    </div>
  );

  if (!isRace) return content;

  const solved = Math.max(0, Math.min(total, engine.correctCount));
  const isGameComplete = playerDoneRef.done || solved >= total;

  return (
    <RaceMode
      totalProblems={total}
      solvedProblems={solved}
      mistakes={engine.mistakesCount}
      npcSecondsPerProblem={npcSecondsPerProblem}
      opponentLevel={starLevel}
      opponentName="Соперник"
      isGameComplete={isGameComplete}
      hideHud={true}
      onOpponentProgressPct={(pct) => setOpponentProgressPct(pct)}
      onRaceEnd={(playerWon, stars) => {
        const timeSec = playerDoneRef.done ? playerDoneRef.timeSec : engine.elapsedSec;
        const correctFirstTry = Math.max(0, solved - wrongUniqueRef.current.size);
        emitFinishOnce({
          correct: correctFirstTry,
          solved,
          total,
          mistakes: engine.mistakesCount,
          timeSec,
          won: playerWon,
          starsEarned: (Math.max(0, Math.min(3, Math.floor(Number(stars || 0)))) as 0 | 1 | 2 | 3) || 0,
        });
      }}
    >
      {content}
    </RaceMode>
  );
}

