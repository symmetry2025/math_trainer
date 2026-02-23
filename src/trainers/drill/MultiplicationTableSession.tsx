'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { MultiplicationTable } from './ui/MultiplicationTable';
import NumberKeyboard from '../../components/NumberKeyboard';
import { cn } from '../../lib/utils';
import { prepareUniqueList } from '../../lib/uniqueProblems';
import { usePhysicalNumberKeyboard } from '../../lib/usePhysicalNumberKeyboard';
import type { SessionMetrics } from '../../trainerFlow';
import { DrillStage } from './engine/DrillStage';
import { useDrillEngine } from './engine/useDrillEngine';

export type MultiplicationProblem = { a: number; b: number; answer: number; options: number[] };

export type MultiplicationTableSessionConfig = {
  order: 'ordered' | 'mixed';
  answerInputMode: 'choice' | 'manual';
  totalProblems: number;
  selectedMultipliers: number[]; // 1..10
  highlightRow: boolean;
  helper: 'numbers' | 'table' | null; // extra helper panel below (not the pythagoras input)
  race?: { starLevel: 1 | 2 | 3; npcSecondsPerProblem: number };
};

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampStarLevel(v: unknown): 1 | 2 | 3 {
  const n = Math.floor(Number(v || 1));
  if (n <= 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function normalizeConfig(cfg: MultiplicationTableSessionConfig): MultiplicationTableSessionConfig {
  const order = cfg.order === 'ordered' ? 'ordered' : 'mixed';
  const answerInputMode = cfg.answerInputMode === 'manual' ? 'manual' : 'choice';
  const totalProblems = clampInt(cfg.totalProblems, 1, 200, 10);

  const base = (Array.isArray(cfg.selectedMultipliers) ? cfg.selectedMultipliers : [])
    .map((n) => clampInt(n, 1, 10, 1))
    .filter((n, idx, arr) => arr.indexOf(n) === idx);
  const selectedMultipliers = (base.length ? base : [1]).slice().sort((a, b) => a - b);

  // Row highlight only makes sense when practicing a single multiplier.
  const highlightRow = !!cfg.highlightRow && selectedMultipliers.length <= 1;
  const helper = cfg.helper === 'numbers' ? 'numbers' : cfg.helper === 'table' ? 'table' : null;
  const race = cfg.race
    ? {
        starLevel: clampStarLevel(cfg.race.starLevel),
        npcSecondsPerProblem: clampInt(cfg.race.npcSecondsPerProblem, 1, 60, 6),
      }
    : undefined;

  return { order, answerInputMode, totalProblems, selectedMultipliers, highlightRow, helper, race };
}

function makeOptions(answer: number): number[] {
  const wrong = new Set<number>();
  // keep options "near" answer, but bounded
  while (wrong.size < 3) {
    const cand = answer + Math.floor(Math.random() * 20) - 10;
    if (cand !== answer && cand > 0 && cand <= 100) wrong.add(cand);
  }
  return [answer, ...Array.from(wrong)].sort(() => Math.random() - 0.5);
}

function makePracticeProblem(selectedMultipliers: number[]): MultiplicationProblem {
  const selected = selectedMultipliers.length ? selectedMultipliers : [1];
  const a = selected[Math.floor(Math.random() * selected.length)] ?? 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const answer = a * b;
  return { a, b, answer, options: makeOptions(answer) };
}

function makeTrainingOrderedProblems(multiplier: number): MultiplicationProblem[] {
  const a = clampInt(multiplier, 1, 10, 1);
  return Array.from({ length: 10 }, (_, i) => {
    const b = i + 1;
    const answer = a * b;
    return { a, b, answer, options: makeOptions(answer) };
  });
}

function makeProblems(cfg: MultiplicationTableSessionConfig): MultiplicationProblem[] {
  const c = normalizeConfig(cfg);
  const count = c.totalProblems;
  const multipliers = c.selectedMultipliers.length ? c.selectedMultipliers : [1];

  if (c.order === 'ordered') {
    const ordered = multipliers.flatMap((a) => makeTrainingOrderedProblems(a));
    return ordered.slice(0, count);
  }

  return prepareUniqueList({
    count,
    make: () => {
      const a = multipliers[Math.floor(Math.random() * multipliers.length)] ?? 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const answer = a * b;
      return { a, b, answer, options: makeOptions(answer) };
    },
    keyOf: (p) => {
      const lo = Math.min(p.a, p.b);
      const hi = Math.max(p.a, p.b);
      return `${lo}x${hi}`;
    },
  });
}

export function MultiplicationTableSession(props: {
  config: MultiplicationTableSessionConfig;
  setMetrics?: (m: SessionMetrics) => void;
  onFinish: (result: {
    correct: number;
    solved: number;
    total: number;
    mistakes: number;
    timeSec: number;
    won?: boolean;
    starsEarned?: 1 | 2 | 3;
  }) => void;
}) {
  const config = useMemo(() => normalizeConfig(props.config), [props.config]);
  const problems = useMemo(() => makeProblems(config), [config]);
  const total = problems.length;
  const [manualAnswer, setManualAnswer] = useState('');
  const [pickedCell, setPickedCell] = useState<{ row: number; col: number } | null>(null);
  const isRace = !!config.race;
  const raceTotalSeconds = isRace ? Math.max(1, Math.round((config.race?.npcSecondsPerProblem ?? 6) * total)) : null;
  const engine = useDrillEngine<MultiplicationProblem>({
    problems,
    total,
    answerOf: (p) => p.answer,
    timer: isRace && raceTotalSeconds ? { mode: 'remaining', totalSeconds: raceTotalSeconds, endOnZero: true } : { mode: 'elapsed' },
    attemptPolicy: config.answerInputMode === 'manual' ? 'untilCorrect' : 'single',
    wrongResetMs: 600,
    onFinish: ({ correct, solved, total, mistakes, timeSec, won }) => {
      if (!isRace) return props.onFinish({ correct, solved, total, mistakes, timeSec });
      const didWin = won === false ? false : true;
      const starsEarned = didWin ? (config.race?.starLevel ?? 1) : undefined;
      return props.onFinish({ correct, solved, total, mistakes, timeSec, won: didWin, starsEarned });
    },
    markDelayMs: 350,
    stepMs: 800,
  });

  const problem = engine.problem ?? null;

  const handleKeyboardInput = (value: number) => {
    if (!problem) return;
    if (engine.selectedAnswer !== null) return;
    const correct = problem.answer;
    const next = (manualAnswer + value.toString()).slice(0, 3);
    setManualAnswer(next);
    const numValue = Number.parseInt(next, 10);
    if (Number.isFinite(numValue)) {
      if (numValue === correct) engine.submitAnswer(numValue);
      else if (next.length >= String(correct).length) engine.submitAnswer(numValue);
    }
  };

  const handleBackspace = () => {
    if (engine.selectedAnswer !== null) return;
    setManualAnswer((v) => v.slice(0, -1));
  };

  // Reset local input artifacts on next problem.
  useEffect(() => {
    setManualAnswer('');
    setPickedCell(null);
  }, [engine.index]);

  // Clear manual input when the engine resets after a wrong attempt (canonical behavior).
  useLayoutEffect(() => {
    if (config.answerInputMode !== 'manual') return;
    if (engine.selectedAnswer === null && engine.status === null) setManualAnswer('');
  }, [config.answerInputMode, engine.index, engine.selectedAnswer, engine.status]);

  usePhysicalNumberKeyboard({
    enabled: config.answerInputMode === 'manual' && engine.selectedAnswer === null,
    onDigit: handleKeyboardInput,
    onBackspace: handleBackspace,
  });

  // Live header metrics
  useEffect(() => {
    if (!props.setMetrics) return;
    const solved = Math.max(0, Math.min(total, engine.index));
    const progressPct = total > 0 ? Math.round((solved / total) * 100) : 0;
    props.setMetrics({
      progressPct,
      total,
      solved,
      correct: engine.correctCount,
      mistakes: engine.mistakesCount,
      badges: [
        { kind: 'counter', label: 'Пример', current: Math.min(total, engine.index + 1), total },
        ...(isRace && raceTotalSeconds
          ? ([{ kind: 'time', label: 'Время', seconds: engine.remainingSec ?? raceTotalSeconds, mode: 'remaining', totalSeconds: raceTotalSeconds }] as const)
          : ([{ kind: 'time', label: 'Время', seconds: engine.elapsedSec, mode: 'elapsed' }] as const)),
        { kind: 'mistakes', label: 'Ошибки', value: engine.mistakesCount },
        ...(isRace
          ? ([
              {
                kind: 'text',
                label: 'Соперник',
                value: `⭐${config.race?.starLevel ?? 1} • ${config.race?.npcSecondsPerProblem ?? 6}с/пример`,
              },
            ] as const)
          : []),
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
    isRace,
    raceTotalSeconds,
    config.race?.starLevel,
    config.race?.npcSecondsPerProblem,
  ]);

  const showHelper = config.helper;

  if (!problem) return null;

  return (
    <div className="w-full">
      <DrillStage
        status={engine.status}
        cardKey={engine.cardKey}
        cardAnimating={engine.cardAnimating}
        card={
          <div className="text-center py-8">
            <div
              className={cn(
                'problem-display inline-block',
                engine.status === 'correct' && 'animate-success',
                engine.status === 'wrong' && 'animate-shake',
              )}
            >
              {problem.a} × {problem.b}
              {config.answerInputMode === 'manual' ? (
                <>
                  {' '}
                  ={' '}
                  <span className={cn('inline-block min-w-[90px] tabular-nums', engine.status === 'wrong' && 'text-destructive')}>
                    {manualAnswer || '?'}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        }
        input={
          config.answerInputMode === 'choice' ? (
            <div className="w-[360px] max-w-full">
              <div className="grid grid-cols-2 gap-2">
                {problem.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => engine.submitAnswer(option)}
                    disabled={engine.selectedAnswer !== null}
                    className={cn(
                      'answer-option !px-0 !py-3',
                      engine.selectedAnswer === option && engine.status === 'correct' && 'answer-correct',
                      engine.selectedAnswer === option && engine.status === 'wrong' && 'answer-wrong',
                      engine.selectedAnswer !== null && option === problem.answer && engine.selectedAnswer !== option && 'answer-correct',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : config.answerInputMode === 'manual' ? (
            <div className="space-y-3">
              <NumberKeyboard
                disabled={engine.selectedAnswer !== null}
                showBackspace={true}
                backspaceEnabled={problem.answer >= 10 && manualAnswer.length > 0}
                onBackspace={handleBackspace}
                onInput={handleKeyboardInput}
              />
            </div>
          ) : (
            <div className="w-full">
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <MultiplicationTable
                    highlightRow={config.highlightRow ? problem.a : null}
                    highlightCol={config.highlightRow ? problem.b : null}
                    selectedCell={pickedCell}
                    selectedStatus={engine.selectedAnswer !== null ? (engine.status === 'correct' ? 'correct' : 'wrong') : null}
                    onPickCell={
                      engine.selectedAnswer !== null
                        ? undefined
                        : (row, col) => {
                            setPickedCell({ row, col });
                            engine.submitAnswer(row * col);
                          }
                    }
                  />
                </div>
              </div>
            </div>
          )
        }
      />

      <div className="mx-auto w-full max-w-5xl">
        {showHelper === 'table' ? (
          <div className="pt-6 mt-6 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Помощник</h3>
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <MultiplicationTable highlightRow={config.highlightRow ? problem.a : null} highlightCol={config.highlightRow ? problem.b : null} />
              </div>
            </div>
          </div>
        ) : null}

        {showHelper === 'numbers' ? (
          <div className="pt-6 mt-6 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Помощник: {problem.a} × ...</h3>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <div
                  key={num}
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm',
                    num === problem.b ? 'bg-selected text-selected-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {problem.a * num}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

