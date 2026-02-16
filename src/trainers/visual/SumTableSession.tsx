'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { cn } from '../../lib/utils';
import type { SessionMetrics } from '../../trainerFlow';
import { RaceMode } from '../../trainerFlow/gameModes';
import NumberKeyboard from '../../components/NumberKeyboard';
import { usePhysicalNumberKeyboard } from '../../lib/usePhysicalNumberKeyboard';
import { DrillStage } from '../drill/engine/DrillStage';
import { useDrillEngine } from '../drill/engine/useDrillEngine';
import type { SumTableKind } from '../../data/sumTableConfig';
import { generateOptions } from '../../data/mentalMathConfig';

type Problem = {
  col: number;
  sum: number;
  a: number;
  b: number;
  missing: 'a' | 'b';
  letterInMissing?: boolean;
  options?: number[];
};

function randInt(min: number, max: number) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  if (b < a) return a;
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeProblems(args: {
  kind: SumTableKind;
  columns: number;
  sumMin: number;
  sumMax: number;
  knownMin: number;
  knownMax: number;
  letter?: string;
  isChoiceMode: boolean;
  order?: 'shuffled' | 'byColumn';
}): Problem[] {
  const columns = Math.max(1, Math.floor(Number(args.columns || 1)));
  const sumMin = Math.max(2, Math.floor(Number(args.sumMin || 12)));
  const sumMax = Math.max(sumMin, Math.floor(Number(args.sumMax || sumMin)));
  const knownMin = Math.max(1, Math.floor(Number(args.knownMin || 2)));
  const knownMax = Math.max(knownMin, Math.floor(Number(args.knownMax || knownMin)));

  const cols: Problem[] = [];
  for (let col = 0; col < columns; col++) {
    // Make a column like in textbook: sum is shown; one addend known; the other is missing.
    for (let attempt = 0; attempt < 60; attempt++) {
      const sum = randInt(sumMin, sumMax);
      const known = randInt(knownMin, Math.min(knownMax, sum - 1));
      const missingValue = sum - known;
      if (missingValue < 1) continue;

      // Decide which row is missing (a vs b).
      let missing: 'a' | 'b' = 'b';
      if (args.kind === 'find-addend') missing = 'b'; // show first addend, find second
      else if (args.kind === 'find-component') missing = 'a'; // show second addend, find first
      else {
        // letter mode: vary which addend is the letter to avoid monotony
        missing = Math.random() < 0.5 ? 'a' : 'b';
      }

      const a = missing === 'a' ? missingValue : known;
      const b = missing === 'b' ? missingValue : known;
      const correct = missing === 'a' ? a : b;

      const options = args.isChoiceMode ? generateOptions(correct, 4, { max: 999 }) : undefined;

      cols.push({
        col,
        sum,
        a,
        b,
        missing,
        letterInMissing: args.kind === 'substitute-letter',
        options,
      });
      break;
    }
  }

  // Default behavior: shuffled play order, stable column indices for UI.
  // Mobile UX: keep a predictable left-to-right fill order (needed for paging 3 columns at a time).
  const order = args.order ?? 'shuffled';
  return order === 'byColumn' ? cols : shuffle(cols);
}

export function SumTableSession(props: {
  attemptId?: string;
  kind: SumTableKind;
  columns: number;
  sumMin: number;
  sumMax: number;
  knownMin: number;
  knownMax: number;
  letter?: string;
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
  const isChoiceMode = props.level === 'accuracy-choice';
  const isSpeed = props.level === 'speed';
  const isRace = props.level === 'race';

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    // Safari < 14 uses addListener/removeListener.
    if ('addEventListener' in mq) {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  const problems = useMemo(() => {
    // attemptId forces a reshuffle / restart on retry (TrainerFlow changes attemptId).
    void props.attemptId;
    return makeProblems({
      kind: props.kind,
      columns: props.columns,
      sumMin: props.sumMin,
      sumMax: props.sumMax,
      knownMin: props.knownMin,
      knownMax: props.knownMax,
      letter: props.letter,
      isChoiceMode,
      order: isMobile ? 'byColumn' : 'shuffled',
    });
  }, [props.attemptId, props.kind, props.columns, props.sumMin, props.sumMax, props.knownMin, props.knownMax, props.letter, isChoiceMode, isMobile]);

  const total = problems.length;
  const [inputValue, setInputValue] = useState('');
  const [filled, setFilled] = useState<Record<number, number>>({});
  const wrongUniqueRef = useMemo(() => new Set<number>(), []);

  useEffect(() => {
    wrongUniqueRef.clear();
    setFilled({});
    setInputValue('');
  }, [props.attemptId, problems, wrongUniqueRef]);

  const totalSeconds = Math.max(1, Math.floor(Number(props.timeLimitSec || 75)));
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

  const engine = useDrillEngine<Problem>({
    problems,
    total,
    answerOf: (p) => (p.missing === 'a' ? p.a : p.b),
    attemptPolicy: isChoiceMode ? 'single' : 'untilCorrect',
    timer: isSpeed ? { mode: 'remaining', totalSeconds, endOnZero: true } : { mode: 'elapsed' },
    wrongResetMs: 600,
    markDelayMs: 300,
    stepMs: 700,
    onFinish: ({ solved, total, mistakes, timeSec, won }) => {
      const solvedNow = Math.max(0, Math.min(total, Math.floor(Number(solved || 0))));
      const correctFirstTry = Math.max(0, solvedNow - wrongUniqueRef.size);

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

  // Clear input before paint when switching to next cell.
  useLayoutEffect(() => {
    if (engine.selectedAnswer === null && engine.status === null) setInputValue('');
  }, [engine.index, engine.selectedAnswer, engine.status]);

  const handleKeyboardInput = useCallback(
    (value: number) => {
      if (engine.selectedAnswer !== null || !problem) return;
      const correct = problem.missing === 'a' ? problem.a : problem.b;
      const next = (inputValue + value.toString()).slice(0, 3);
      setInputValue(next);
      const numValue = Number.parseInt(next, 10);
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
    enabled: engine.selectedAnswer === null && !isChoiceMode,
    onDigit: handleKeyboardInput,
    onBackspace: handleBackspace,
  });

  // Persist filled cells on correct answers.
  useEffect(() => {
    if (!problem) return;
    if (engine.status !== 'correct') return;
    const correct = problem.missing === 'a' ? problem.a : problem.b;
    setFilled((prev) => {
      if (prev[problem.col] === correct) return prev;
      return { ...prev, [problem.col]: correct };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.status, problem?.col, problem?.a, problem?.b, problem?.missing]);

  useEffect(() => {
    if (!problem) return;
    if (engine.status !== 'wrong') return;
    wrongUniqueRef.add(problem.col);
  }, [engine.status, problem, wrongUniqueRef]);

  useEffect(() => {
    if (!props.setMetrics) return;
    const solved = Math.max(0, Math.min(total, engine.correctCount));
    const progressPct = total > 0 ? Math.round((solved / total) * 100) : 0;
    const correctFirstTry = Math.max(0, solved - wrongUniqueRef.size);
    const counterCurrent = isRace ? solved : Math.min(total, engine.index + 1);

    props.setMetrics({
      progressPct,
      opponentProgressPct: isRace ? opponentProgressPct : undefined,
      total,
      solved,
      correct: correctFirstTry,
      mistakes: engine.mistakesCount,
      badges: [
        { kind: 'counter', label: 'Колонка', current: counterCurrent, total },
        ...(isSpeed && typeof engine.remainingSec === 'number' && typeof engine.totalSeconds === 'number'
          ? ([{ kind: 'time', label: 'Время', seconds: engine.remainingSec, mode: 'remaining', totalSeconds: engine.totalSeconds }] as const)
          : ([{ kind: 'time', label: 'Время', seconds: engine.elapsedSec, mode: 'elapsed' }] as const)),
        { kind: 'mistakes', label: 'Ошибки', value: engine.mistakesCount },
        ...(isRace ? ([{ kind: 'text', label: 'Соперник', value: opponentTitle }] as const) : ([] as const)),
      ],
    });
  }, [
    props.setMetrics,
    total,
    engine.index,
    engine.correctCount,
    engine.mistakesCount,
    engine.elapsedSec,
    engine.remainingSec,
    engine.totalSeconds,
    isSpeed,
    isRace,
    opponentProgressPct,
    opponentTitle,
    wrongUniqueRef,
  ]);

  if (!problem) return null;

  const groupSize = isMobile ? 3 : props.columns;
  const groupIndex = isMobile ? Math.floor(Math.max(0, currentCol) / groupSize) : 0;
  const groupStart = isMobile ? groupIndex * groupSize : 0;
  const groupEnd = isMobile ? Math.min(props.columns, groupStart + groupSize) : props.columns;
  const visibleCols = Array.from({ length: Math.max(0, groupEnd - groupStart) }).map((_, i) => groupStart + i);

  const cellClass =
    'h-12 sm:h-14 min-w-0 px-1 sm:px-2 rounded-xl border-2 flex items-center justify-center text-lg sm:text-2xl font-extrabold tabular-nums';

  const labelCellClass = cn(cellClass, 'bg-muted border-border text-xs sm:text-sm font-bold tracking-tight');

  const missingValue = problem.missing === 'a' ? problem.a : problem.b;
  const showLetter = problem.letterInMissing ? (props.letter || 'a') : null;

  const renderCellValue = (col: number, which: 'a' | 'b') => {
    const isCurrent = col === currentCol;
    const pForCol = problems.find((p) => p.col === col) ?? null;
    if (!pForCol) return <span className="text-muted-foreground/30">?</span>;

    const isMissing = pForCol.missing === which;
    if (!isMissing) {
      return which === 'a' ? pForCol.a : pForCol.b;
    }

    const filledVal = filled[col];
    if (typeof filledVal === 'number') return filledVal;

    if (isCurrent) {
      return <span className={cn(!inputValue ? 'text-muted-foreground/60' : 'text-foreground')}>{inputValue || (showLetter ?? '?')}</span>;
    }

    return <span className="text-muted-foreground/30">{showLetter ?? '?'}</span>;
  };

  const content = (
    <div className="w-full">
      <DrillStage
        status={engine.status}
        cardKey={isMobile ? groupIndex : 0}
        cardAnimating={isMobile}
        cardWrapperClassName="max-w-none"
        card={
          <div className="w-full flex items-center justify-center">
            <div className="w-full">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `${isMobile ? '5.25rem' : '7rem'} repeat(${Math.max(1, visibleCols.length)}, minmax(3.25rem, 1fr))`,
                }}
              >
                <div className={labelCellClass}>Слагаемое</div>
                {visibleCols.map((col) => {
                  const isCurrent = col === currentCol;
                  return (
                    <div
                      key={`a-${col}`}
                      className={cn(
                        cellClass,
                        'bg-card border-border',
                        isCurrent && problem.missing === 'a' && 'border-primary/60 bg-primary/5',
                        engine.status === 'wrong' && isCurrent && problem.missing === 'a' && 'border-destructive/60 bg-destructive/5',
                      )}
                    >
                      {renderCellValue(col, 'a')}
                    </div>
                  );
                })}

                <div className={labelCellClass}>Слагаемое</div>
                {visibleCols.map((col) => {
                  const isCurrent = col === currentCol;
                  return (
                    <div
                      key={`b-${col}`}
                      className={cn(
                        cellClass,
                        'bg-card border-border',
                        isCurrent && problem.missing === 'b' && 'border-primary/60 bg-primary/5',
                        engine.status === 'wrong' && isCurrent && problem.missing === 'b' && 'border-destructive/60 bg-destructive/5',
                      )}
                    >
                      {renderCellValue(col, 'b')}
                    </div>
                  );
                })}

                <div className={labelCellClass}>Сумма</div>
                {visibleCols.map((col) => {
                  const pForCol = problems.find((p) => p.col === col) ?? null;
                  return (
                    <div key={`s-${col}`} className={cn(cellClass, 'bg-muted border-border')}>
                      {pForCol ? pForCol.sum : <span className="text-muted-foreground/30">?</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        }
        input={
          isChoiceMode ? (
            <div className="w-[360px] max-w-full mx-auto">
              <div className="grid grid-cols-2 gap-2">
                {(problem.options ?? generateOptions(missingValue, 4, { max: 999 })).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={engine.selectedAnswer !== null}
                    onClick={() => engine.submitAnswer(opt)}
                    className={cn(
                      'answer-option !px-0 !py-3',
                      engine.selectedAnswer !== null && 'opacity-60 cursor-not-allowed',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <NumberKeyboard
              disabled={engine.selectedAnswer !== null}
              showBackspace={true}
              backspaceEnabled={inputValue.length > 0}
              onBackspace={handleBackspace}
              onInput={(n) => handleKeyboardInput(n)}
            />
          )
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

