import { useCallback, useMemo, useState } from 'react';

import type { ColumnSubtractionState, SubtractionInputStep, SubtractionProblem } from './types';

export type ColumnSubtractionVariant =
  | '2d-1d-no-borrow'
  | '2d-2d-no-borrow'
  | '2d-1d-borrow'
  | '2d-2d-borrow'
  | '3d-2d'
  | '3d-3d';

function randInt(min: number, maxInclusive: number): number {
  const a = Math.ceil(min);
  const b = Math.floor(maxInclusive);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function generateVariantProblem(variant: ColumnSubtractionVariant): SubtractionProblem {
  if (variant === '2d-1d-no-borrow') {
    const aT = randInt(1, 9);
    const aU = randInt(1, 9); // must allow 1..aU
    const b = randInt(1, aU);
    return { minuend: aT * 10 + aU, subtrahend: b };
  }
  if (variant === '2d-1d-borrow') {
    const aT = randInt(1, 9);
    const aU = randInt(0, 8); // must allow aU+1..9
    const b = randInt(aU + 1, 9);
    return { minuend: aT * 10 + aU, subtrahend: b };
  }
  if (variant === '2d-2d-no-borrow') {
    const aT = randInt(1, 9);
    const aU = randInt(0, 9);
    // ensure b < a and no borrow in ones (bU <= aU)
    const bTMax = aU === 0 ? Math.max(1, aT - 1) : aT;
    const bT = randInt(1, bTMax);
    const bU =
      bT === aT
        ? randInt(0, Math.max(0, aU - 1)) // must be strictly smaller overall
        : randInt(0, aU);
    return { minuend: aT * 10 + aU, subtrahend: bT * 10 + bU };
  }
  if (variant === '3d-2d') {
    for (let i = 0; i < 400; i++) {
      const minuend = randInt(100, 999);
      const subtrahend = randInt(10, 99);
      if (subtrahend >= minuend) continue;
      return { minuend, subtrahend };
    }
    return { minuend: 742, subtrahend: 53 };
  }
  if (variant === '3d-3d') {
    for (let i = 0; i < 600; i++) {
      const minuend = randInt(200, 999);
      const subtrahend = randInt(100, minuend - 1);
      if (subtrahend >= minuend) continue;
      return { minuend, subtrahend };
    }
    return { minuend: 864, subtrahend: 327 };
  }
  // 2d-2d-borrow
  const aT = randInt(2, 9); // must allow bT < aT (and bT >= 1)
  const aU = randInt(0, 8); // must allow aU+1..9
  const bT = randInt(1, aT - 1);
  const bU = randInt(aU + 1, 9);
  return { minuend: aT * 10 + aU, subtrahend: bT * 10 + bU };
}

export const generateSubtractionProblem = (
  difficulty: 'easy' | 'medium' | 'hard',
  variant?: ColumnSubtractionVariant,
): SubtractionProblem => {
  if (variant) return generateVariantProblem(variant);

  let minuend: number, subtrahend: number;

  switch (difficulty) {
    case 'easy':
      minuend = Math.floor(Math.random() * 89) + 11; // 11-99
      subtrahend = Math.floor(Math.random() * (minuend - 10)) + 10;
      break;
    case 'medium':
      minuend = Math.floor(Math.random() * 899) + 101;
      subtrahend = Math.floor(Math.random() * (minuend - 100)) + 100;
      break;
    case 'hard':
      minuend = Math.floor(Math.random() * 8999) + 1001;
      subtrahend = Math.floor(Math.random() * (minuend - 1000)) + 1000;
      break;
  }

  return { minuend, subtrahend };
};

const getDigits = (num: number): number[] => num.toString().split('').map(Number).reverse();

const calculateSubtractionSteps = (problem: SubtractionProblem): { steps: SubtractionInputStep[] } => {
  const { minuend, subtrahend } = problem;
  const minuendDigits = getDigits(minuend);
  const subtrahendDigits = getDigits(subtrahend);

  const steps: SubtractionInputStep[] = [];
  let stepId = 0;
  let borrow = 0;
  const maxDigits = Math.max(minuendDigits.length, subtrahendDigits.length);

  for (let position = 0; position < maxDigits; position++) {
    const minuendDigit = minuendDigits[position] || 0;
    const subtrahendDigit = subtrahendDigits[position] || 0;

    let currentMinuend = minuendDigit - borrow;
    if (currentMinuend < subtrahendDigit) {
      steps.push({
        id: `step-${stepId++}`,
        type: 'borrow',
        position: position + 1,
        expectedValue: 1,
        isCompleted: false,
        userValue: null,
      });
      currentMinuend += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }

    const resultDigit = currentMinuend - subtrahendDigit;
    steps.push({
      id: `step-${stepId++}`,
      type: 'result',
      position,
      expectedValue: resultDigit,
      isCompleted: false,
      userValue: null,
    });
  }

  return { steps };
};

export const useColumnSubtraction = (difficulty: 'easy' | 'medium' | 'hard' = 'medium', variant?: ColumnSubtractionVariant) => {
  const [state, setState] = useState<ColumnSubtractionState>(() => {
    const problem = generateSubtractionProblem(difficulty, variant);
    const { steps } = calculateSubtractionSteps(problem);
    return {
      problem,
      steps,
      currentStepIndex: 0,
      result: [],
      borrows: new Map(),
      isComplete: false,
      mistakesCount: 0,
    };
  });

  const currentStep = useMemo(() => state.steps[state.currentStepIndex] || null, [state.steps, state.currentStepIndex]);

  const handleInput = useCallback((value: number) => {
    setState((prev) => {
      if (prev.isComplete || !prev.steps[prev.currentStepIndex]) return prev;

      const step = prev.steps[prev.currentStepIndex];
      const isCorrect = value === step.expectedValue;
      if (!isCorrect) return { ...prev, mistakesCount: prev.mistakesCount + 1 };

      const newSteps = [...prev.steps];
      newSteps[prev.currentStepIndex] = { ...step, isCompleted: true, userValue: value };

      const newResult = [...prev.result];
      const newBorrows = new Map(prev.borrows);

      if (step.type === 'result') {
        while (newResult.length <= step.position) newResult.push(null);
        newResult[step.position] = value;
      } else if (step.type === 'borrow') {
        newBorrows.set(`${step.position}`, value);
      }

      const nextIndex = prev.currentStepIndex + 1;
      const isComplete = nextIndex >= prev.steps.length;

      return { ...prev, steps: newSteps, currentStepIndex: nextIndex, result: newResult, borrows: newBorrows, isComplete };
    });
  }, []);

  const reset = useCallback(
    (newDifficulty?: 'easy' | 'medium' | 'hard', problemOverride?: SubtractionProblem) => {
      const problem = problemOverride ?? generateSubtractionProblem(newDifficulty || difficulty, variant);
      const { steps } = calculateSubtractionSteps(problem);
      setState({
        problem,
        steps,
        currentStepIndex: 0,
        result: [],
        borrows: new Map(),
        isComplete: false,
        mistakesCount: 0,
      });
    },
    [difficulty, variant],
  );

  return { state, currentStep, handleInput, reset };
};

