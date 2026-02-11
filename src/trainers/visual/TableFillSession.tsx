'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { cn } from '../../lib/utils';
import type { SessionMetrics } from '../../trainerFlow';
import NumberKeyboard from '../../components/NumberKeyboard';
import { usePhysicalNumberKeyboard } from '../../lib/usePhysicalNumberKeyboard';
import { DrillStage } from '../drill/engine/DrillStage';
import { useDrillEngine } from '../drill/engine/useDrillEngine';
import { RaceMode } from '../../trainerFlow/gameModes';

export type TableFillProblem = {
  col: number;
  a: number;
  add: number;
  answer: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeProblems(args: { aValues: number[]; add: number }): TableFillProblem[] {
  const add = Math.floor(Number(args.add || 0));
  const base = (Array.isArray(args.aValues) ? args.aValues : []).map((n) => Math.floor(Number(n)));
  const aValues = base.filter((n) => Number.isFinite(n));
  const cells = aValues.map((a, col) => ({ col, a, add, answer: a + add }));
  return shuffle(cells);
}

export function TableFillSession(props: {
  attemptId?: string;
  aValues: number[];
  add: number;
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
    return makeProblems({ aValues: props.aValues, add: props.add });
  }, [props.attemptId, props.aValues, props.add]);
  const total = problems.length;

  const [inputValue, setInputValue] = useState('');
  const [filled, setFilled] = useState<Record<number, number>>({});
  const wrongUniqueRef = useMemo(() => new Set<number>(), []);

  useEffect(() => {
    wrongUniqueRef.clear();
    setFilled({});
    setInputValue('');
  }, [props.attemptId, problems, wrongUniqueRef]);

  const isSpeed = props.level === 'speed';
  const isRace = props.level === 'race';
  const totalSeconds = Math.max(1, Math.floor(Number(props.timeLimitSec || 60)));
  const starLevel = (props.starLevel ?? 1) as 1 | 2 | 3;
  const npcSecondsPerProblem = Math.max(1, Number(props.npcSecondsPerProblem || 6));

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

  const engine = useDrillEngine<TableFillProblem>({
    problems,
    total,
    answerOf: (p) => p.answer,
    attemptPolicy: 'untilCorrect',
    timer: isSpeed ? { mode: 'remaining', totalSeconds, endOnZero: true } : { mode: 'elapsed' },
    wrongResetMs: 600,
    markDelayMs: 350,
    stepMs: 800,
    onFinish: ({ solved, total, mistakes, timeSec, won }) => {
      const solvedNow = Math.max(0, Math.min(total, Math.floor(Number(solved || 0))));
      const correctFirstTry = Math.max(0, solvedNow - wrongUniqueRef.size);

      // In race mode the result is determined by RaceMode (player vs NPC).
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
  const currentCol = problem?.col ?? -1;

  // IMPORTANT: clear input before paint when switching to next cell,
  // otherwise the next highlighted cell may briefly show the previous input for 1 frame.
  useLayoutEffect(() => {
    // Clear on step advance AND on wrong-reset unlock.
    if (engine.selectedAnswer === null && engine.status === null) setInputValue('');
  }, [engine.index, engine.selectedAnswer, engine.status]);

  const handleKeyboardInput = useCallback(
    (value: number) => {
      if (engine.selectedAnswer !== null || !problem) return;
      const next = (inputValue + value.toString()).slice(0, 3);
      setInputValue(next);
      const numValue = Number.parseInt(next, 10);
      const correct = problem.answer;
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

  // Persist filled cells on correct answers.
  useEffect(() => {
    if (!problem) return;
    if (engine.status !== 'correct') return;
    setFilled((prev) => {
      if (prev[problem.col] === problem.answer) return prev;
      return { ...prev, [problem.col]: problem.answer };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.status, problem?.col, problem?.answer]);

  useEffect(() => {
    if (!problem) return;
    if (engine.status !== 'wrong') return;
    // Track unique wrong cells for first-try correctness.
    wrongUniqueRef.add(problem.col);
  }, [engine.status, problem, wrongUniqueRef]);

  useEffect(() => {
    if (!props.setMetrics) return;
    const solved = Math.max(0, Math.min(total, engine.correctCount));
    const progressPct = total > 0 ? Math.round((solved / total) * 100) : 0;
    const correctFirstTry = Math.max(0, solved - wrongUniqueRef.size);
    props.setMetrics({
      progressPct,
      total,
      solved,
      correct: correctFirstTry,
      mistakes: engine.mistakesCount,
      badges: [
        { kind: 'counter', label: 'Ячейка', current: Math.min(total, engine.index + 1), total },
        ...(isSpeed && typeof engine.remainingSec === 'number' && typeof engine.totalSeconds === 'number'
          ? ([{ kind: 'time', label: 'Время', seconds: engine.remainingSec, mode: 'remaining', totalSeconds: engine.totalSeconds }] as const)
          : ([{ kind: 'time', label: 'Время', seconds: engine.elapsedSec, mode: 'elapsed' }] as const)),
        { kind: 'mistakes', label: 'Ошибки', value: engine.mistakesCount },
      ],
    });
  }, [props.setMetrics, total, engine.index, engine.correctCount, engine.mistakesCount, engine.elapsedSec, engine.remainingSec, engine.totalSeconds, isSpeed]);

  if (!problem) return null;

  const rowLabel = `a + ${problem.add}`;

  const cellClass =
    'h-12 sm:h-14 min-w-[3.5rem] sm:min-w-[4rem] px-2 rounded-xl border-2 flex items-center justify-center text-xl sm:text-2xl font-extrabold tabular-nums';

  const content = (
    <div className="w-full">
      <DrillStage
        status={engine.status}
        // Single static card for the whole session (no enter/exit animation per cell)
        cardKey={0}
        cardAnimating={false}
        card={
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-[520px]">
              <div className="grid grid-cols-[4.25rem_repeat(6,1fr)] gap-2">
                {/* header row */}
                <div className={cn(cellClass, 'bg-muted border-border text-sm sm:text-base font-bold')}>a</div>
                {props.aValues.slice(0, 6).map((a, idx) => (
                  <div key={`a-${idx}`} className={cn(cellClass, 'bg-muted border-border')}>
                    {a}
                  </div>
                ))}

                {/* formula row */}
                <div className={cn(cellClass, 'bg-muted border-border text-sm sm:text-base font-bold')}>{rowLabel}</div>
                {props.aValues.slice(0, 6).map((_, idx) => {
                  const isCurrent = idx === currentCol;
                  const val = filled[idx];
                  return (
                    <div
                      key={`v-${idx}`}
                      className={cn(
                        cellClass,
                        'bg-card border-border',
                        isCurrent && 'border-primary/60 bg-primary/5',
                        engine.status === 'wrong' && isCurrent && 'border-destructive/60 bg-destructive/5',
                      )}
                    >
                      {typeof val === 'number' ? (
                        val
                      ) : isCurrent ? (
                        <span className={cn(!inputValue ? 'text-muted-foreground/60' : 'text-foreground')}>{inputValue || '?'}</span>
                      ) : (
                        // Keep placeholder symbol stable to avoid "• -> ?" flicker when switching highlighted cell.
                        <span className="text-muted-foreground/30">?</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        }
        input={
          <NumberKeyboard
            disabled={engine.selectedAnswer !== null}
            showBackspace={true}
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
      onRaceEnd={(playerWon, stars) => {
        const timeSec = playerDoneRef.done ? playerDoneRef.timeSec : engine.elapsedSec;
        const correctFirstTry = Math.max(0, solved - wrongUniqueRef.size);
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

