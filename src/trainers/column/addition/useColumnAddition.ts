import { useCallback, useMemo, useState } from 'react';

import type { AdditionInputStep, AdditionProblem, ColumnAdditionState } from './types';

export type ColumnAdditionVariant =
  | '2d-1d-no-carry'
  | '2d-1d-carry'
  | '2d-2d-no-carry'
  | '2d-2d-carry'
  | '3d-2d'
  | '3d-3d'
  | null;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateVariantProblem(variant: Exclude<ColumnAdditionVariant, null>): AdditionProblem {
  // Grade-2 focused variants (within 100 / avoid 3-digit results where possible).
  if (variant === '2d-1d-no-carry') {
    const tens = randInt(1, 9);
    const ones = randInt(0, 9);
    const num1 = tens * 10 + ones;
    const maxB = 9 - ones; // ensure no carry
    const num2 = randInt(0, Math.max(0, maxB));
    return { numbers: [num1, num2] };
  }
  if (variant === '2d-1d-carry') {
    const tens = randInt(1, 8); // keep within 99 after carry
    const ones = randInt(0, 9);
    const num1 = tens * 10 + ones;
    const minB = Math.max(0, 10 - ones); // force carry
    const num2 = randInt(minB, 9);
    return { numbers: [num1, num2] };
  }
  if (variant === '2d-2d-no-carry') {
    const aT = randInt(1, 9);
    const aO = randInt(0, 9);
    const bT = randInt(1, 9);
    const bO = randInt(0, Math.max(0, 9 - aO)); // ones no carry
    // tens no carry (since carry=0)
    const bTClamped = Math.min(bT, 9 - aT);
    const num1 = aT * 10 + aO;
    const num2 = Math.max(10, bTClamped * 10 + bO);
    return { numbers: [num1, num2] };
  }
  if (variant === '3d-2d') {
    // 3-digit + 2-digit, sum <= 999
    for (let attempt = 0; attempt < 200; attempt++) {
      const num1 = randInt(100, 999);
      const maxB = 999 - num1;
      if (maxB < 10) continue;
      const num2 = randInt(10, Math.min(99, maxB));
      return { numbers: [num1, num2] };
    }
    return { numbers: [340, 57] };
  }
  if (variant === '3d-3d') {
    // 3-digit + 3-digit, sum <= 999
    for (let attempt = 0; attempt < 400; attempt++) {
      const num1 = randInt(100, 899);
      const maxB = 999 - num1;
      if (maxB < 100) continue;
      const num2 = randInt(100, Math.min(899, maxB));
      return { numbers: [num1, num2] };
    }
    return { numbers: [478, 356] };
  }
  // 2d-2d-carry: force ones carry, but avoid 3-digit result (tens sum + carry < 10)
  // IMPORTANT: if aO = 0, it's impossible to force a carry with a single digit (bO is 0..9).
  // So we generate until we guarantee ones-carry and keep result within 2 digits.
  for (let attempt = 0; attempt < 50; attempt++) {
    const aT = randInt(1, 8);
    const aO = randInt(1, 9); // must be 1..9 to allow carry
    const minBO = 10 - aO; // 1..9
    const bO = randInt(minBO, 9); // ones carry guaranteed
    const maxBT = Math.max(1, 8 - aT); // tens + carry(1) <=9 => bT <= 8 - aT
    const bT = randInt(1, maxBT);
    const num1 = aT * 10 + aO;
    const num2 = bT * 10 + bO;
    // Defensive: ensure carry really happens and total stays 2-digit.
    const onesCarry = aO + bO >= 10;
    const total = num1 + num2;
    if (onesCarry && total >= 10 && total <= 99) return { numbers: [num1, num2] };
  }
  // Fallback (should never happen): hard-coded carry example.
  return { numbers: [58, 47] };
}

export const generateAdditionProblem = (difficulty: 'easy' | 'medium' | 'hard', variant?: ColumnAdditionVariant): AdditionProblem => {
  if (variant && variant !== null) return generateVariantProblem(variant);
  let num1: number, num2: number;

  switch (difficulty) {
    case 'easy':
      num1 = Math.floor(Math.random() * 90) + 10;
      num2 = Math.floor(Math.random() * 90) + 10;
      break;
    case 'medium':
      num1 = Math.floor(Math.random() * 900) + 100;
      num2 = Math.floor(Math.random() * 900) + 100;
      break;
    case 'hard':
      num1 = Math.floor(Math.random() * 9000) + 1000;
      num2 = Math.floor(Math.random() * 9000) + 1000;
      break;
  }

  return { numbers: [num1, num2] };
};

const getDigits = (num: number): number[] => {
  return num.toString().split('').map(Number).reverse();
};

const calculateAdditionSteps = (problem: AdditionProblem): { steps: AdditionInputStep[] } => {
  const { numbers } = problem;
  const total = numbers.reduce((sum, n) => sum + n, 0);
  const totalDigits = getDigits(total);

  const steps: AdditionInputStep[] = [];
  let stepId = 0;
  let carry = 0;

  const maxInputDigits = Math.max(...numbers.map((n) => n.toString().length));

  for (let position = 0; position < totalDigits.length; position++) {
    let columnSum = carry;
    numbers.forEach((num) => {
      const digits = getDigits(num);
      if (position < digits.length) columnSum += digits[position];
    });

    const resultDigit = columnSum % 10;
    const newCarry = Math.floor(columnSum / 10);

    steps.push({
      id: `step-${stepId++}`,
      type: 'result',
      position,
      expectedValue: resultDigit,
      isCompleted: false,
      userValue: null,
    });

    if (newCarry > 0 && position < maxInputDigits - 1) {
      steps.push({
        id: `step-${stepId++}`,
        type: 'carry',
        position: position + 1,
        expectedValue: newCarry,
        isCompleted: false,
        userValue: null,
      });
    }

    carry = newCarry;
  }

  return { steps };
};

export const useColumnAddition = (difficulty: 'easy' | 'medium' | 'hard' = 'medium', variant: ColumnAdditionVariant = null) => {
  const [state, setState] = useState<ColumnAdditionState>(() => {
    const problem = generateAdditionProblem(difficulty, variant);
    const { steps } = calculateAdditionSteps(problem);
    return {
      problem,
      steps,
      currentStepIndex: 0,
      result: [],
      carries: new Map(),
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
      const newCarries = new Map(prev.carries);

      if (step.type === 'result') {
        while (newResult.length <= step.position) newResult.push(null);
        newResult[step.position] = value;
      } else if (step.type === 'carry') {
        newCarries.set(`${step.position}`, value);
      }

      const nextIndex = prev.currentStepIndex + 1;
      const isComplete = nextIndex >= prev.steps.length;

      return {
        ...prev,
        steps: newSteps,
        currentStepIndex: nextIndex,
        result: newResult,
        carries: newCarries,
        isComplete,
      };
    });
  }, []);

  const reset = useCallback(
    (newDifficulty?: 'easy' | 'medium' | 'hard', problemOverride?: AdditionProblem) => {
      const problem = problemOverride ?? generateAdditionProblem(newDifficulty || difficulty, variant);
      const { steps } = calculateAdditionSteps(problem);
      setState({
        problem,
        steps,
        currentStepIndex: 0,
        result: [],
        carries: new Map(),
        isComplete: false,
        mistakesCount: 0,
      });
    },
    [difficulty, variant],
  );

  const getProgress = useCallback(() => {
    return { current: state.currentStepIndex, total: state.steps.length };
  }, [state.currentStepIndex, state.steps.length]);

  return { state, currentStep, handleInput, reset, getProgress };
};

