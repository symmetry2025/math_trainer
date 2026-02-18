'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../../lib/utils';
import type { SessionMetrics } from '../../trainerFlow';
import { RaceMode } from '../../trainerFlow/gameModes';
import NumberKeyboard from '../../components/NumberKeyboard';
import { usePhysicalNumberKeyboard } from '../../lib/usePhysicalNumberKeyboard';
import { DrillStage } from '../drill/engine/DrillStage';
import { useDrillEngine } from '../drill/engine/useDrillEngine';
import { generateOptions } from '../../data/mentalMathConfig';

type MiniTable = {
  tableIndex: number;
  letter: string;
  letterValue: number;
  add1: number;
  add2: number;
};

type Problem = {
  idx: number;
  tableIndex: number;
  row: 1 | 2;
  answer: number;
  options?: number[];
};

function randInt(min: number, max: number) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  if (b < a) return a;
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function makeTables(args: {
  tableCount: number;
  letter: string;
  letterValueMin: number;
  letterValueMax: number;
  addMin: number;
  addMax: number;
}): MiniTable[] {
  const tableCount = Math.max(1, Math.floor(Number(args.tableCount || 1)));
  const letter = (args.letter || 'a').trim() || 'a';
  const letterValueMin = Math.floor(Number(args.letterValueMin || 1));
  const letterValueMax = Math.max(letterValueMin, Math.floor(Number(args.letterValueMax || letterValueMin)));
  const addMin = Math.floor(Number(args.addMin || 1));
  const addMax = Math.max(addMin, Math.floor(Number(args.addMax || addMin)));

  const out: MiniTable[] = [];
  for (let tableIndex = 0; tableIndex < tableCount; tableIndex++) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const letterValue = randInt(letterValueMin, letterValueMax);
      const add1 = randInt(addMin, addMax);
      const add2 = randInt(addMin, addMax);
      if (add1 === add2) continue;
      const a1 = letterValue + add1;
      const a2 = letterValue + add2;
      if (a1 > 999 || a2 > 999) continue;
      out.push({ tableIndex, letter, letterValue, add1, add2 });
      break;
    }
    if (out.length !== tableIndex + 1) {
      // fallback
      const letterValue = Math.min(letterValueMax, Math.max(letterValueMin, 13));
      out.push({ tableIndex, letter, letterValue, add1: 27, add2: 18 });
    }
  }
  return out;
}

function makeProblems(args: { tables: MiniTable[]; isChoiceMode: boolean }): Problem[] {
  const out: Problem[] = [];
  for (const t of args.tables) {
    const a1 = t.letterValue + t.add1;
    const a2 = t.letterValue + t.add2;
    const idxBase = t.tableIndex * 2;
    out.push({
      idx: idxBase,
      tableIndex: t.tableIndex,
      row: 1,
      answer: a1,
      options: args.isChoiceMode ? generateOptions(a1, 4, { max: 999 }) : undefined,
    });
    out.push({
      idx: idxBase + 1,
      tableIndex: t.tableIndex,
      row: 2,
      answer: a2,
      options: args.isChoiceMode ? generateOptions(a2, 4, { max: 999 }) : undefined,
    });
  }
  return out;
}

function keyOf(p: { tableIndex: number; row: 1 | 2 }) {
  return `${p.tableIndex}:${p.row}`;
}

export function SubstituteLetterSession(props: {
  attemptId?: string;
  tableCount: number;
  letter: string;
  letterValueMin: number;
  letterValueMax: number;
  addMin: number;
  addMax: number;
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
  const totalSeconds = Math.max(1, Math.floor(Number(props.timeLimitSec || 75)));
  const starLevel = (props.starLevel ?? 1) as 1 | 2 | 3;
  const npcSecondsPerProblem = Math.max(1, Number(props.npcSecondsPerProblem || 6));
  const [opponentProgressPct, setOpponentProgressPct] = useState(0);
  const opponentTitle = starLevel === 1 ? 'Новичок' : starLevel === 2 ? 'Знаток' : 'Мастер';

  const tables = useMemo(() => {
    void props.attemptId;
    return makeTables({
      tableCount: props.tableCount,
      letter: props.letter,
      letterValueMin: props.letterValueMin,
      letterValueMax: props.letterValueMax,
      addMin: props.addMin,
      addMax: props.addMax,
    });
  }, [props.attemptId, props.tableCount, props.letter, props.letterValueMin, props.letterValueMax, props.addMin, props.addMax]);

  const problems = useMemo(() => {
    return makeProblems({ tables, isChoiceMode });
  }, [tables, isChoiceMode]);

  const total = problems.length;
  const [inputValue, setInputValue] = useState('');
  const [filled, setFilled] = useState<Record<string, number>>({});
  const wrongUniqueRef = useMemo(() => new Set<number>(), []);

  useEffect(() => {
    wrongUniqueRef.clear();
    setFilled({});
    setInputValue('');
  }, [props.attemptId, problems, wrongUniqueRef]);

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
    answerOf: (p) => p.answer,
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
  const currentTableIndex = problem?.tableIndex ?? 0;
  const currentRow = problem?.row ?? 1;
  const currentTable = tables[currentTableIndex] ?? null;

  // Always behave like "mobile": one vertical mini-table (2 answers), then the next mini-table.
  // We animate ONLY when switching to the next mini-table (i.e. when tableIndex changes),
  // not between the 1st and 2nd answer within the same table.
  const groupSize = 1;
  const desiredPageIndex = Math.max(0, currentTableIndex);
  const [pageIndex, setPageIndex] = useState(() => desiredPageIndex);
  const [pageKey, setPageKey] = useState(0);
  const [pageAnimating, setPageAnimating] = useState(false);
  const pageTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (pageTimerRef.current) window.clearTimeout(pageTimerRef.current);
    pageTimerRef.current = null;
    setPageAnimating(false);
    setPageIndex(desiredPageIndex);
    setPageKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.attemptId]);

  useEffect(() => {
    if (desiredPageIndex === pageIndex) return;

    if (pageTimerRef.current) window.clearTimeout(pageTimerRef.current);
    setPageAnimating(true);
    const tid = window.setTimeout(() => {
      setPageIndex(desiredPageIndex);
      setPageKey((k) => k + 1);
      setPageAnimating(false);
      pageTimerRef.current = null;
    }, 280);
    pageTimerRef.current = tid;
    return () => {
      if (pageTimerRef.current === tid) window.clearTimeout(tid);
    };
  }, [desiredPageIndex, pageIndex]);

  const groupStart = pageIndex * groupSize;
  const groupEnd = Math.min(Math.max(1, Math.floor(Number(props.tableCount || 1))), groupStart + groupSize);
  const visibleTables = Array.from({ length: Math.max(0, groupEnd - groupStart) }).map((_, i) => groupStart + i);

  useLayoutEffect(() => {
    if (engine.selectedAnswer === null && engine.status === null) setInputValue('');
  }, [engine.index, engine.selectedAnswer, engine.status]);

  const handleKeyboardInput = useCallback(
    (value: number) => {
      if (pageAnimating) return;
      if (engine.selectedAnswer !== null || !problem) return;
      const correct = problem.answer;
      const next = (inputValue + value.toString()).slice(0, 3);
      setInputValue(next);
      const numValue = Number.parseInt(next, 10);
      if (numValue === correct) {
        engine.submitAnswer(numValue);
      } else if (next.length >= String(correct).length) {
        engine.submitAnswer(numValue);
      }
    },
    [engine, inputValue, problem, pageAnimating],
  );

  const handleBackspace = useCallback(() => {
    if (engine.selectedAnswer !== null) return;
    setInputValue((p) => p.slice(0, -1));
  }, [engine.selectedAnswer]);

  usePhysicalNumberKeyboard({
    enabled: engine.selectedAnswer === null && !isChoiceMode && !pageAnimating,
    onDigit: handleKeyboardInput,
    onBackspace: handleBackspace,
  });

  useEffect(() => {
    if (!problem) return;
    if (engine.status !== 'correct') return;
    setFilled((prev) => {
      const k = keyOf(problem);
      if (prev[k] === problem.answer) return prev;
      return { ...prev, [k]: problem.answer };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.status, problem?.tableIndex, problem?.row, problem?.answer]);

  useEffect(() => {
    if (!problem) return;
    if (engine.status !== 'wrong') return;
    // Track unique wrong examples for first-try correctness.
    wrongUniqueRef.add(problem.idx);
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
        { kind: 'counter', label: 'Пример', current: counterCurrent, total },
        ...(isSpeed && typeof engine.remainingSec === 'number' && typeof engine.totalSeconds === 'number'
          ? ([{ kind: 'time', label: 'Время', seconds: engine.remainingSec, mode: 'remaining', totalSeconds: engine.totalSeconds }] as const)
          : ([{ kind: 'time', label: 'Время', seconds: engine.elapsedSec, mode: 'elapsed' }] as const)),
        { kind: 'mistakes', label: 'Ошибки', value: engine.mistakesCount },
        ...(isRace ? ([{ kind: 'text', label: 'Соперник', value: opponentTitle }] as const) : ([] as const)),
      ],
    });
  }, [props.setMetrics, total, engine.index, engine.correctCount, engine.mistakesCount, engine.elapsedSec, engine.remainingSec, engine.totalSeconds, isSpeed, isRace, opponentProgressPct, opponentTitle, wrongUniqueRef]);

  if (!problem || !currentTable) return null;

  const cellClass =
    'h-12 sm:h-14 min-w-[6.5rem] px-2 rounded-xl border-2 flex items-center justify-center text-lg sm:text-2xl font-extrabold tabular-nums';
  const labelCellClass = cn(cellClass, 'bg-muted border-border text-sm sm:text-base font-bold tracking-tight min-w-[7.5rem]');

  const renderAnswerCell = (tableIndex: number, row: 1 | 2) => {
    const isCurrent = tableIndex === currentTableIndex && row === currentRow;
    const val = filled[keyOf({ tableIndex, row })];
    if (typeof val === 'number') return val;
    if (!isCurrent) return <span className="text-muted-foreground/30">?</span>;
    return <span className={cn(!inputValue ? 'text-muted-foreground/60' : 'text-foreground')}>{inputValue || '?'}</span>;
  };

  const content = (
    <div className="w-full">
      <DrillStage
        status={engine.status}
        // Animate only between mini-tables (after 2 answers), keeping the card width canonical.
        cardKey={pageKey}
        cardAnimating={pageAnimating}
        card={
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-[520px]">
              {visibleTables.map((tableIndex) => {
                const t = tables[tableIndex] ?? null;
                if (!t) return null;
                const isTCurrent = tableIndex === currentTableIndex;
                return (
                  <div key={tableIndex} className="grid grid-cols-2 gap-2">
                    <div className={labelCellClass}>{t.letter}</div>
                    <div className={cn(cellClass, 'bg-card border-border')}>{t.letterValue}</div>

                    <div className={labelCellClass}>
                      {t.letter} + {t.add1}
                    </div>
                    <div
                      className={cn(
                        cellClass,
                        'bg-card border-border',
                        isTCurrent && currentRow === 1 && 'border-primary/60 bg-primary/5',
                        engine.status === 'wrong' && isTCurrent && currentRow === 1 && 'border-destructive/60 bg-destructive/5',
                      )}
                    >
                      {renderAnswerCell(tableIndex, 1)}
                    </div>

                    <div className={labelCellClass}>
                      {t.letter} + {t.add2}
                    </div>
                    <div
                      className={cn(
                        cellClass,
                        'bg-card border-border',
                        isTCurrent && currentRow === 2 && 'border-primary/60 bg-primary/5',
                        engine.status === 'wrong' && isTCurrent && currentRow === 2 && 'border-destructive/60 bg-destructive/5',
                      )}
                    >
                      {renderAnswerCell(tableIndex, 2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        }
        input={
          isChoiceMode ? (
            <div className="w-[360px] max-w-full mx-auto">
              <div className="grid grid-cols-2 gap-2">
                {(problem.options ?? generateOptions(problem.answer, 4, { max: 999 })).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={engine.selectedAnswer !== null || pageAnimating}
                    onClick={() => engine.submitAnswer(opt)}
                    className={cn('answer-option !px-0 !py-3', engine.selectedAnswer !== null && 'opacity-60 cursor-not-allowed')}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <NumberKeyboard
              disabled={engine.selectedAnswer !== null || pageAnimating}
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

