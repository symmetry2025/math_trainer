'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../../lib/utils';
import type { SessionMetrics } from '../../trainerFlow';
import NumberKeyboard from '../../components/NumberKeyboard';
import { usePhysicalNumberKeyboard } from '../../lib/usePhysicalNumberKeyboard';
import { DrillStage } from '../drill/engine/DrillStage';
import { useDrillEngine } from '../drill/engine/useDrillEngine';
import { RaceMode } from '../../trainerFlow/gameModes';

type CellKey = string; // `${sum}:${row}:${side}`

type HouseCellProblem = {
  sum: number;
  row: number; // 0..sum
  side: 'left' | 'right';
  answer: number;
  key: CellKey;
};

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cellKey(sum: number, row: number, side: 'left' | 'right'): CellKey {
  return `${sum}:${row}:${side}`;
}

function generateBoard(args: { minSum: number; maxSum: number }) {
  const minSum = clampInt(args.minSum, 2, 20, 2);
  const maxSum = clampInt(args.maxSum, minSum, 20, Math.max(minSum, 10));
  const sums = Array.from({ length: maxSum - minSum + 1 }, (_, i) => minSum + i);

  // For each (sum,row) we prefill one side and keep the other empty.
  // row represents "a" from 0..sum, and the pair is (a, sum-a).
  const filled: Record<CellKey, number> = {};
  const emptiesBySum: Record<number, HouseCellProblem[]> = {};

  for (const sum of sums) {
    emptiesBySum[sum] = [];
    for (let row = 0; row <= sum; row++) {
      const left = row;
      const right = sum - row;
      const prefillLeft = Math.random() < 0.5;
      if (prefillLeft) {
        filled[cellKey(sum, row, 'left')] = left;
        emptiesBySum[sum]!.push({ sum, row, side: 'right', answer: right, key: cellKey(sum, row, 'right') });
      } else {
        filled[cellKey(sum, row, 'right')] = right;
        emptiesBySum[sum]!.push({ sum, row, side: 'left', answer: left, key: cellKey(sum, row, 'left') });
      }
    }
  }

  return { sums, filled, emptiesBySum };
}

export function HouseNumbersSession(props: {
  attemptId?: string;
  minSum: number;
  maxSum: number;
  /**
   * Preset may pass a number, but for "houses" we always run until the board is fully filled:
   * totalProblems is derived from the actual number of empty cells (rows) in the houses.
   */
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
  const board = useMemo(() => {
    void props.attemptId;
    return generateBoard({ minSum: props.minSum, maxSum: props.maxSum });
  }, [props.attemptId, props.minSum, props.maxSum]);

  // Build problems in steps: sum asc; inside each sum, random order.
  const problems = useMemo(() => {
    const perSum = board.sums.map((sum) => shuffle(board.emptiesBySum[sum] ?? []));
    // IMPORTANT: домики всегда заполняем полностью (кол-во задач = кол-во пустых строк/ячеек).
    return perSum.flat();
  }, [board.sums, board.emptiesBySum]);

  const total = problems.length;

  const [inputValue, setInputValue] = useState('');
  const [filled, setFilled] = useState<Record<CellKey, number>>(board.filled);

  const wrongUniqueRef = useRef<Set<CellKey>>(new Set());
  const houseExitTimerRef = useRef<number | null>(null);
  const lastExitIndexRef = useRef<number | null>(null);
  const [houseAnimating, setHouseAnimating] = useState(false);
  const [houseCardKey, setHouseCardKey] = useState(0);
  const [displaySum, setDisplaySum] = useState<number>(board.sums[0] ?? props.minSum);

  useEffect(() => {
    wrongUniqueRef.current.clear();
    setFilled(board.filled);
    setInputValue('');
    setHouseAnimating(false);
    setHouseCardKey((k) => k + 1);
    setDisplaySum(board.sums[0] ?? props.minSum);
    lastExitIndexRef.current = null;
    if (houseExitTimerRef.current) window.clearTimeout(houseExitTimerRef.current);
    houseExitTimerRef.current = null;
  }, [board]);

  const isSpeed = props.level === 'speed';
  const isRace = props.level === 'race';
  const totalSeconds = Math.max(1, Math.floor(Number(props.timeLimitSec || 60)));
  const starLevel = (props.starLevel ?? 1) as 1 | 2 | 3;
  const npcSecondsPerProblem = Math.max(1, Number(props.npcSecondsPerProblem || 6));
  const [opponentProgressPct, setOpponentProgressPct] = useState(0);
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

  const engine = useDrillEngine<HouseCellProblem>({
    problems,
    total,
    answerOf: (p) => p.answer,
    attemptPolicy: 'untilCorrect',
    timer: isSpeed ? { mode: 'remaining', totalSeconds, endOnZero: true } : { mode: 'elapsed' },
    wrongResetMs: 600,
    markDelayMs: 250,
    stepMs: 500,
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

  const current = engine.problem ?? null;

  // Start "card exit" animation ONLY when moving to the next house (sum changes).
  useEffect(() => {
    if (!current) return;
    if (engine.status !== 'correct') return;
    const next = problems[engine.index + 1] ?? null;
    if (!next) return; // finished
    if (next.sum === displaySum) return; // same house => no card transition
    if (lastExitIndexRef.current === engine.index) return;
    lastExitIndexRef.current = engine.index;
    if (houseExitTimerRef.current) window.clearTimeout(houseExitTimerRef.current);
    // Align with canonical drill timing: start exit shortly after marking answer.
    houseExitTimerRef.current = window.setTimeout(() => setHouseAnimating(true), 250);
  }, [current, engine.status, engine.index, problems, displaySum]);

  // When the engine advances to the next cell, update displayed house if needed.
  useEffect(() => {
    const nextSum = problems[engine.index]?.sum ?? null;
    if (!nextSum) return;
    if (nextSum === displaySum) return;
    setDisplaySum(nextSum);
    setHouseCardKey((k) => k + 1);
    setHouseAnimating(false);
  }, [engine.index, problems, displaySum]);

  // Clear input before paint when switching to another cell.
  useLayoutEffect(() => {
    if (engine.selectedAnswer === null && engine.status === null) setInputValue('');
  }, [engine.index, engine.selectedAnswer, engine.status]);

  // Track "first try" mistakes per cell.
  useEffect(() => {
    if (!current) return;
    if (engine.status !== 'wrong') return;
    wrongUniqueRef.current.add(current.key);
  }, [engine.status, current]);

  // Persist filled cells on correct.
  useEffect(() => {
    if (!current) return;
    if (engine.status !== 'correct') return;
    setFilled((prev) => ({ ...prev, [current.key]: current.answer }));
  }, [engine.status, current]);

  const handleKeyboardInput = useCallback(
    (value: number) => {
      if (engine.selectedAnswer !== null || !current) return;
      const next = (inputValue + value.toString()).slice(0, 2);
      setInputValue(next);
      const numValue = Number.parseInt(next, 10);
      const correct = current.answer;
      if (numValue === correct) engine.submitAnswer(numValue);
      else if (next.length >= String(correct).length) engine.submitAnswer(numValue);
    },
    [engine, inputValue, current],
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

  // Live header metrics
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
        { kind: 'counter', label: 'Ячейка', current: counterCurrent, total },
        ...(isSpeed && typeof engine.remainingSec === 'number' && typeof engine.totalSeconds === 'number'
          ? ([{ kind: 'time', label: 'Время', seconds: engine.remainingSec, mode: 'remaining', totalSeconds: engine.totalSeconds }] as const)
          : ([{ kind: 'time', label: 'Время', seconds: engine.elapsedSec, mode: 'elapsed' }] as const)),
        { kind: 'mistakes', label: 'Ошибки', value: engine.mistakesCount },
        ...(isRace ? ([{ kind: 'text', label: 'Соперник', value: opponentTitle }] as const) : ([] as const)),
      ],
    });
  }, [props.setMetrics, total, engine.index, engine.correctCount, engine.elapsedSec, engine.remainingSec, engine.totalSeconds, engine.mistakesCount, isSpeed, isRace, opponentProgressPct, opponentTitle]);

  const renderHouse = (sum: number) => {
    const rows = Array.from({ length: sum + 1 }, (_, i) => i);
    return (
      <div key={sum} className="w-[150px] sm:w-[170px]">
        <div className="mx-auto w-full rounded-2xl border-2 border-border bg-card overflow-hidden">
          {/* Header (like TableFill): full-width rectangle with the target sum */}
          <div className="h-10 sm:h-11 bg-muted border-b border-border flex items-center justify-center">
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground">{sum}</div>
          </div>
          {rows.map((row) => {
            const leftK = cellKey(sum, row, 'left');
            const rightK = cellKey(sum, row, 'right');
            const isCurrentLeft = !!current && current.key === leftK;
            const isCurrentRight = !!current && current.key === rightK;

            const leftVal = filled[leftK];
            const rightVal = filled[rightK];

            const cellBase =
              'h-10 sm:h-11 flex items-center justify-center font-extrabold tabular-nums text-xl sm:text-2xl';

            const isLastRow = row === sum;

            const renderCell = (side: 'left' | 'right', val: number | undefined, isCurrent: boolean) => {
              const showInput = isCurrent && val === undefined;
              const display = val !== undefined ? String(val) : showInput ? inputValue || '?' : '?';
              return (
                <div
                  className={cn(
                    cellBase,
                    'w-1/2',
                    row > 0 && 'border-t border-border',
                    side === 'left' ? 'border-r border-border' : '',
                    // Match the table rounding so the highlight ring doesn't "stick out" in corners.
                    isLastRow && side === 'left' && 'rounded-bl-2xl',
                    isLastRow && side === 'right' && 'rounded-br-2xl',
                    // Keep filled "given" numbers slightly muted, closer to TableFill's header vibe.
                    val !== undefined ? 'bg-muted/40' : 'bg-card',
                    isCurrent && 'bg-primary/5 ring-inset ring-2 ring-primary/50',
                    engine.status === 'wrong' && isCurrent && 'bg-destructive/5 ring-destructive/50',
                  )}
                >
                  <span className={cn(val === undefined && !showInput ? 'text-muted-foreground/30' : val === undefined && !inputValue ? 'text-muted-foreground/60' : 'text-foreground')}>
                    {display}
                  </span>
                </div>
              );
            };

            return (
              <div key={row} className="flex">
                {renderCell('left', leftVal, isCurrentLeft)}
                {renderCell('right', rightVal, isCurrentRight)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const content = (
    <div className="w-full">
      <DrillStage
        status={engine.status}
        // Use canonical card enter/exit animation only when switching houses.
        cardKey={houseCardKey}
        cardAnimating={houseAnimating}
        layout="rowOnDesktop"
        card={
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-4xl flex items-start justify-center">
              {/* Show only ONE house per step (fits on screen): current sum */}
              {renderHouse(displaySum)}
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

