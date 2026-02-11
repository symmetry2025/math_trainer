'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ArithmeticEquationLevel, ArithmeticEquationProblem, ArithmeticEquationTrainerConfig } from '../../data/arithmeticEquationConfig';
import { MENTAL_MATH_OPPONENT_NAMES, generateOptions } from '../../data/mentalMathConfig';
import { usePhysicalNumberKeyboard } from '../../lib/usePhysicalNumberKeyboard';
import { cn } from '../../lib/utils';
import { prepareUniqueList } from '../../lib/uniqueProblems';
import type { SessionMetrics } from '../../trainerFlow';
import NumberKeyboard from '../../components/NumberKeyboard';
import { DrillStage } from '../drill/engine/DrillStage';
import { useDrillEngine } from '../drill/engine/useDrillEngine';

type Problem = ArithmeticEquationProblem & {
  options?: number[];
};

function renderEquation(problem: Problem, unknownDisplay: string) {
  if (problem.kind === 'add-missing-addend') {
    if (problem.unknownPosition === 'left') {
      return (
        <>
          <span className="inline-block min-w-[64px] tabular-nums">{unknownDisplay}</span> + {problem.known} = {problem.sum}
        </>
      );
    }
    return (
      <>
        {problem.known} + <span className="inline-block min-w-[64px] tabular-nums">{unknownDisplay}</span> = {problem.sum}
      </>
    );
  }
  if (problem.kind === 'sub-missing-minuend') {
    return (
      <>
        <span className="inline-block min-w-[64px] tabular-nums">{unknownDisplay}</span> − {problem.subtrahend} = {problem.difference}
      </>
    );
  }
  return (
    <>
      {problem.minuend} − <span className="inline-block min-w-[64px] tabular-nums">{unknownDisplay}</span> = {problem.difference}
    </>
  );
}

export default function ArithmeticEquationSession(props: {
  config: ArithmeticEquationTrainerConfig;
  level: ArithmeticEquationLevel;
  starLevel?: 1 | 2 | 3;
  onComplete: (r: { solved: number; correct: number; total: number; mistakes: number; timeSec: number; won?: boolean }) => void;
  setMetrics?: (m: SessionMetrics) => void;
}) {
  const { config, level, starLevel = 1, onComplete } = props;

  const levelConfig = config.levels[level];
  const totalProblems = levelConfig.problems;
  const timeLimitSec = levelConfig.timeLimit || 60;
  const isRaceMode = level === 'race';
  const isSpeedMode = level === 'speed';
  const isChoiceMode = level === 'accuracy-choice';

  const problems = useMemo<Problem[]>(
    () =>
      prepareUniqueList({
        count: totalProblems,
        make: () => {
          const base = config.generator();
          const options = isChoiceMode ? generateOptions(base.answer) : undefined;
          return { ...base, options };
        },
        keyOf: (p) => {
          if (p.kind === 'add-missing-addend') return `${config.id}:${level}:add:${p.sum}:${p.known}:${p.unknownPosition}`;
          if (p.kind === 'sub-missing-minuend') return `${config.id}:${level}:subMin:${p.subtrahend}:${p.difference}`;
          return `${config.id}:${level}:subSub:${p.minuend}:${p.difference}`;
        },
      }),
    [config, level, totalProblems, isChoiceMode],
  );

  const [inputValue, setInputValue] = useState('');
  const [gameEnded, setGameEnded] = useState(false);

  const npcIntervalRef = useRef<number | null>(null);
  const npcProgressRef = useRef(0);
  const [npcProgressPct, setNpcProgressPct] = useState(0);

  const engine = useDrillEngine<Problem>({
    problems,
    total: totalProblems,
    answerOf: (p) => p.answer,
    timer:
      isSpeedMode || isRaceMode
        ? { mode: 'remaining', totalSeconds: timeLimitSec, endOnZero: isSpeedMode }
        : { mode: 'elapsed' },
    attemptPolicy: isChoiceMode ? 'single' : 'untilCorrect',
    wrongResetMs: 600,
    markDelayMs: 250,
    stepMs: 600,
    onFinish: (r) => {
      if (npcIntervalRef.current) window.clearInterval(npcIntervalRef.current);
      setGameEnded(true);

      const timeSec = Math.floor(Number(r.timeSec || 0));
      let won: boolean | undefined = undefined;
      if (isSpeedMode) {
        won = r.correct >= totalProblems && timeSec <= timeLimitSec;
        if (r.won === false) won = false;
      } else if (isRaceMode) {
        won = npcProgressRef.current < 100;
        if (r.won === false) won = false;
      }

      onComplete({
        solved: r.solved,
        correct: r.correct,
        total: totalProblems,
        mistakes: r.mistakes,
        timeSec,
        won,
      });
    },
  });

  const problem = engine.problem ?? null;

  useEffect(() => {
    if (!isRaceMode || gameEnded) return;
    // Reset NPC progress at start of each race run.
    npcProgressRef.current = 0;
    setNpcProgressPct(0);
    const npcSecondsPerProblem = config.npcSpeeds[starLevel];
    const npcProgressPerSecond = (100 / totalProblems) / npcSecondsPerProblem;
    npcIntervalRef.current = window.setInterval(() => {
      const next = Math.min(100, npcProgressRef.current + npcProgressPerSecond);
      npcProgressRef.current = next;
      setNpcProgressPct(next);
      if (next >= 100) {
        if (npcIntervalRef.current) window.clearInterval(npcIntervalRef.current);
        engine.finishOnce({ won: false });
      }
    }, 1000);
    return () => {
      if (npcIntervalRef.current) window.clearInterval(npcIntervalRef.current);
    };
  }, [isRaceMode, gameEnded, config.npcSpeeds, starLevel, totalProblems, engine.finishOnce]);

  const handleKeyboardInput = useCallback(
    (value: number) => {
      if (gameEnded || engine.selectedAnswer !== null || !problem) return;
      const newValue = inputValue + value.toString();
      setInputValue(newValue);
      const numValue = Number.parseInt(newValue, 10);
      if (numValue === problem.answer) {
        engine.submitAnswer(numValue);
      } else if (newValue.length >= problem.answer.toString().length) {
        engine.submitAnswer(numValue);
      }
    },
    [gameEnded, engine, inputValue, problem],
  );

  const handleBackspace = useCallback(() => {
    if (gameEnded || engine.selectedAnswer !== null) return;
    setInputValue((p) => p.slice(0, -1));
  }, [gameEnded, engine.selectedAnswer]);

  usePhysicalNumberKeyboard({
    enabled: !gameEnded && engine.selectedAnswer === null && !isChoiceMode,
    onDigit: handleKeyboardInput,
    onBackspace: handleBackspace,
  });

  useEffect(() => {
    if (engine.selectedAnswer === null && engine.status === null) setInputValue('');
  }, [engine.index, engine.selectedAnswer, engine.status]);

  const timeRemaining = engine.remainingSec ?? timeLimitSec;

  useEffect(() => {
    const push = props.setMetrics;
    if (!push) return;
    const badges: NonNullable<SessionMetrics['badges']> = [
      { kind: 'counter', label: 'Пример', current: Math.min(totalProblems, engine.index + 1), total: totalProblems },
      ...(isSpeedMode || isRaceMode
        ? ([{ kind: 'time', label: 'Время', seconds: timeRemaining, mode: 'remaining', totalSeconds: timeLimitSec }] as const)
        : ([{ kind: 'time', label: 'Время', seconds: engine.elapsedSec, mode: 'elapsed' }] as const)),
      { kind: 'mistakes', label: 'Ошибки', value: engine.mistakesCount },
      ...(isRaceMode
        ? ([
            {
              kind: 'text',
              label: 'Соперник',
              value: `${MENTAL_MATH_OPPONENT_NAMES[starLevel]}`,
            },
          ] as const)
        : []),
    ];
    const solved = Math.max(0, Math.min(totalProblems, engine.index));
    const progressPct = totalProblems > 0 ? Math.round((solved / totalProblems) * 100) : 0;
    push({
      badges,
      progressPct,
      opponentProgressPct: isRaceMode ? npcProgressPct : undefined,
      total: totalProblems,
      solved,
      correct: engine.correctCount,
      mistakes: engine.mistakesCount,
    });
  }, [
    props.setMetrics,
    totalProblems,
    engine.index,
    isSpeedMode,
    isRaceMode,
    timeRemaining,
    timeLimitSec,
    engine.elapsedSec,
    engine.mistakesCount,
    engine.correctCount,
    starLevel,
    npcProgressPct,
  ]);

  const sessionContent = problem ? (
    <DrillStage
      status={engine.status}
      cardKey={engine.cardKey}
      cardAnimating={engine.cardAnimating}
      card={
        <div className="relative w-full h-full">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                'problem-display inline-block text-4xl md:text-5xl font-bold text-center',
                engine.status === 'correct' && 'text-success',
                engine.status === 'wrong' && 'animate-shake text-destructive',
              )}
            >
              {renderEquation(
                problem,
                isChoiceMode
                  ? engine.selectedAnswer !== null
                    ? String(engine.selectedAnswer)
                    : '?'
                  : inputValue || '?',
              )}
            </div>
          </div>
        </div>
      }
      input={
        isChoiceMode && problem.options ? (
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
        ) : !isChoiceMode ? (
          <NumberKeyboard
            onInput={(n) => handleKeyboardInput(n)}
            onBackspace={handleBackspace}
            showBackspace={true}
            backspaceEnabled={problem.answer >= 10 && inputValue.length > 0}
            disabled={engine.selectedAnswer !== null}
          />
        ) : null
      }
    />
  ) : null;

  return <div className="w-full">{sessionContent}</div>;
}

