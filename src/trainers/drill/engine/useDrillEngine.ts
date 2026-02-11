'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DrillAnswerStatus, DrillAttemptPolicy, DrillEngineResult, DrillTimerConfig } from './types';

export function useDrillEngine<TProblem>(args: {
  problems: TProblem[];
  /** Total problems for the run (usually problems.length). */
  total: number;
  /** Get numeric correct answer from a problem. */
  answerOf: (p: TProblem) => number;
  /**
   * Called when the run ends.
   * Note: engine guarantees it fires once.
   */
  onFinish: (r: DrillEngineResult) => void;
  /** Optional: timer configuration. */
  timer?: DrillTimerConfig;
  /**
   * Animation timings:
   * - markDelayMs: delay before exit animation starts after an answer
   * - stepMs: total step duration before next problem / finish
   */
  markDelayMs?: number;
  stepMs?: number;
  /** How wrong answers behave: single attempt advances; untilCorrect stays on the same problem. */
  attemptPolicy?: DrillAttemptPolicy;
  /** For attemptPolicy=untilCorrect: delay before clearing wrong status and allowing retry. */
  wrongResetMs?: number;
}) {
  const total = Math.max(0, Math.floor(Number(args.total || 0)));
  const problems = args.problems;

  const markDelayMs = Math.max(0, Math.floor(Number(args.markDelayMs ?? 250)));
  const stepMs = Math.max(markDelayMs, Math.floor(Number(args.stepMs ?? 800)));
  const attemptPolicy: DrillAttemptPolicy = args.attemptPolicy ?? 'single';
  const wrongResetMs = Math.max(0, Math.floor(Number(args.wrongResetMs ?? 600)));

  const [index, setIndex] = useState(0);
  const [cardKey, setCardKey] = useState(0);
  const [cardAnimating, setCardAnimating] = useState(false);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [status, setStatus] = useState<DrillAnswerStatus>(null);

  const [correctCount, setCorrectCount] = useState(0);
  const [mistakesCount, setMistakesCount] = useState(0);
  const correctRef = useRef(0);
  const mistakesRef = useRef(0);
  const wrongResetRef = useRef<number | null>(null);

  const startMsRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);
  const finishRef = useRef(args.onFinish);
  finishRef.current = args.onFinish;

  const [elapsedSec, setElapsedSec] = useState(0);
  const [remainingSec, setRemainingSec] = useState<number | null>(args.timer?.mode === 'remaining' ? args.timer.totalSeconds : null);

  const remainingTimer = args.timer?.mode === 'remaining' ? args.timer : null;
  const isRemaining = !!remainingTimer;
  const totalSeconds = remainingTimer ? Math.max(1, Math.floor(Number(remainingTimer.totalSeconds || 1))) : null;
  const endOnZero = remainingTimer ? !!remainingTimer.endOnZero : false;

  // Reset when problems identity changes (new attempt).
  useEffect(() => {
    finishedRef.current = false;
    startMsRef.current = Date.now();
    setIndex(0);
    setCardKey((k) => k + 1);
    setCardAnimating(false);
    setSelectedAnswer(null);
    setStatus(null);
    setCorrectCount(0);
    setMistakesCount(0);
    correctRef.current = 0;
    mistakesRef.current = 0;
    if (wrongResetRef.current) window.clearTimeout(wrongResetRef.current);
    wrongResetRef.current = null;
    setElapsedSec(0);
    setRemainingSec(isRemaining ? totalSeconds : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems]);

  const finishOnce = useCallback((extra?: Partial<Pick<DrillEngineResult, 'won'>>) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const timeSec = Math.floor((Date.now() - startMsRef.current) / 1000);
    const solvedRaw = attemptPolicy === 'single' ? correctRef.current + mistakesRef.current : correctRef.current;
    const solved = Math.max(0, Math.min(total, Math.floor(Number(solvedRaw || 0))));
    finishRef.current({
      correct: correctRef.current,
      solved,
      total,
      mistakes: mistakesRef.current,
      timeSec,
      ...extra,
    });
  }, [total, attemptPolicy]);

  // Timer ticks.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startMsRef.current) / 1000);
      setElapsedSec(elapsed);
      if (!isRemaining) return;
      const nextRemaining = Math.max(0, (totalSeconds ?? 1) - elapsed);
      setRemainingSec(nextRemaining);
      if (endOnZero && nextRemaining <= 0) {
        finishOnce({ won: false });
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [isRemaining, totalSeconds, endOnZero, finishOnce]);

  const problem = useMemo(() => problems[index], [problems, index]);
  const answer = useMemo(() => (problem ? args.answerOf(problem) : 0), [problem, args]);

  const submitAnswer = useCallback(
    (v: number) => {
      if (finishedRef.current) return;
      if (selectedAnswer !== null) return;
      if (!problem) return;

      if (wrongResetRef.current) {
        window.clearTimeout(wrongResetRef.current);
        wrongResetRef.current = null;
      }

      const ok = Number(v) === Number(answer);
      const nextCorrect = correctRef.current + (ok ? 1 : 0);
      const nextMistakes = mistakesRef.current + (ok ? 0 : 1);
      correctRef.current = nextCorrect;
      mistakesRef.current = nextMistakes;

      setSelectedAnswer(v);
      setStatus(ok ? 'correct' : 'wrong');
      setCorrectCount(nextCorrect);
      setMistakesCount(nextMistakes);

      // In "untilCorrect" mode, a wrong attempt does NOT advance to the next problem.
      if (!ok && attemptPolicy === 'untilCorrect') {
        if (wrongResetRef.current) window.clearTimeout(wrongResetRef.current);
        wrongResetRef.current = window.setTimeout(() => {
          setSelectedAnswer(null);
          setStatus(null);
          wrongResetRef.current = null;
        }, wrongResetMs);
        return;
      }

      window.setTimeout(() => setCardAnimating(true), markDelayMs);
      window.setTimeout(() => {
        const nextIdx = index + 1;
        if (nextIdx >= total) {
          finishOnce();
          return;
        }
        setIndex(nextIdx);
        setSelectedAnswer(null);
        setStatus(null);
        setCardKey((k) => k + 1);
        setCardAnimating(false);
      }, stepMs);
    },
    [selectedAnswer, problem, answer, attemptPolicy, wrongResetMs, markDelayMs, stepMs, index, total, finishOnce],
  );

  return {
    index,
    total,
    problem,
    correctAnswer: answer,

    selectedAnswer,
    status,
    correctCount,
    mistakesCount,

    elapsedSec,
    remainingSec,
    totalSeconds,

    cardKey,
    cardAnimating,

    submitAnswer,
    finishOnce,
    isFinished: finishedRef.current,
  };
}

