import { useCallback, useMemo, useState } from 'react';

import type { ColumnSubtractionState, SubtractionInputStep, SubtractionProblem } from './types';

export const generateSubtractionProblem = (difficulty: 'easy' | 'medium' | 'hard'): SubtractionProblem => {
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

export const useColumnSubtraction = (difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
  const [state, setState] = useState<ColumnSubtractionState>(() => {
    const problem = generateSubtractionProblem(difficulty);
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
      const problem = problemOverride ?? generateSubtractionProblem(newDifficulty || difficulty);
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
    [difficulty],
  );

  return { state, currentStep, handleInput, reset };
};

