'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import NumberKeyboard from '../../components/NumberKeyboard';
import type { MentalMathLevel, MentalMathTrainerConfig } from '../../data/mentalMathConfig';
import { generateOptions, MENTAL_MATH_OPPONENT_NAMES } from '../../data/mentalMathConfig';
import { usePhysicalNumberKeyboard } from '../../lib/usePhysicalNumberKeyboard';
import { cn } from '../../lib/utils';
import { prepareUniqueList } from '../../lib/uniqueProblems';
import type { SessionMetrics } from '../../trainerFlow';
import { DrillStage } from '../drill/engine/DrillStage';
import { useDrillEngine } from '../drill/engine/useDrillEngine';

type Problem = {
  a: number;
  b: number;
  answer: number;
  options?: number[];
};

export default function MentalMathSession(props: {
  config: MentalMathTrainerConfig;
  level: MentalMathLevel;
  starLevel?: 1 | 2 | 3;
  onComplete: (r: { solved: number; correct: number; total: number; mistakes: number; timeSec: number; won?: boolean }) => void;
  /** optional live metrics channel for TrainerFlow sessionFrame */
  setMetrics?: (m: SessionMetrics) => void;
}) {
  const { config, level, starLevel = 1, onComplete } = props;

  const levelConfig = config.levels[level];
  const totalProblems = levelConfig.problems;
  const timeLimit = levelConfig.timeLimit;
  const isRaceMode = level === 'race';
  const isSpeedMode = level === 'speed';
  const isChoiceMode = level === 'accuracy-choice';

  const problems = useMemo<Problem[]>(
    () =>
      prepareUniqueList({
        count: totalProblems,
        make: () => {
          const { a, b, answer } = config.generator();
          const options = isChoiceMode ? generateOptions(answer) : undefined;
          return { a, b, answer, options };
        },
        keyOf: (p) => {
          // treat commutative as same to the user
          const lo = Math.min(p.a, p.b);
          const hi = Math.max(p.a, p.b);
          return `${config.id}:${level}:${lo}:${hi}`;
        },
      }),
    [config, level, totalProblems, isChoiceMode],
  );

  const [inputValue, setInputValue] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [npcProgressPct, setNpcProgressPct] = useState(0);

  const npcIntervalRef = useRef<number | null>(null);
  const npcProgressRef = useRef(0);

  const timeLimitSec = timeLimit || 60;
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
      // Stop timers/intervals and delegate result.
      if (npcIntervalRef.current) window.clearInterval(npcIntervalRef.current);
      setGameEnded(true);

      const timeSec = Math.floor(Number(r.timeSec || 0));
      let won: boolean | undefined = undefined;
      if (isSpeedMode) {
        // Must solve all within time.
        won = r.correct >= totalProblems && timeSec <= timeLimitSec;
        if (r.won === false) won = false; // time-out path
      } else if (isRaceMode) {
        // win unless NPC already finished.
        won = npcProgressRef.current < 100;
        if (r.won === false) won = false; // NPC win path
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
    // Clear input when engine unlocks after wrong attempt or advances to next problem.
    if (engine.selectedAnswer === null && engine.status === null) setInputValue('');
  }, [engine.index, engine.selectedAnswer, engine.status]);

  const timeRemaining = engine.remainingSec ?? timeLimitSec;
  const operatorSymbol =
    config.problemType === 'addition'
      ? '+'
      : config.problemType === 'subtraction'
        ? '−'
        : config.problemType === 'multiplication'
          ? '×'
          : '÷';

  // Live session metrics for canonical session frame
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
    config.npcSpeeds,
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
              {problem.a} {operatorSymbol} {problem.b} ={' '}
              {!isChoiceMode ? (
                <span
                  className={cn(
                    'inline-block min-w-[80px] tabular-nums',
                    engine.status === 'correct' && 'text-success',
                    engine.status === 'wrong' && 'text-destructive',
                  )}
                >
                  {inputValue || '?'}
                </span>
              ) : (
                '?'
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

