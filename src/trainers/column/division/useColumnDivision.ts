import { useCallback, useMemo, useState } from 'react';

import type { ColumnDivisionState, DivisionProblem, DivisionStep, DivisionWorkingStep } from './types';

// Генерация задачи деления (без остатка)
export const generateDivisionProblem = (difficulty: 'easy' | 'medium' | 'hard'): DivisionProblem => {
  let dividend: number, divisor: number, quotient: number;

  switch (difficulty) {
    case 'easy':
      divisor = Math.floor(Math.random() * 7) + 2; // 2-8
      quotient = Math.floor(Math.random() * 9) + 11; // 11-19
      dividend = divisor * quotient;
      break;
    case 'medium':
      divisor = Math.floor(Math.random() * 7) + 2;
      quotient = Math.floor(Math.random() * 90) + 10;
      dividend = divisor * quotient;
      break;
    case 'hard':
      divisor = Math.floor(Math.random() * 8) + 12; // 12-19
      quotient = Math.floor(Math.random() * 40) + 10; // 10-49
      dividend = divisor * quotient;
      break;
  }

  return { dividend, divisor, quotient, remainder: 0 };
};

const getDigitsLTR = (num: number): number[] => num.toString().split('').map(Number);

const calculateDivisionSteps = (problem: DivisionProblem): { steps: DivisionStep[]; workingSteps: DivisionWorkingStep[] } => {
  const { dividend, divisor, quotient } = problem;
  const dividendDigits = getDigitsLTR(dividend);
  const quotientDigits = getDigitsLTR(quotient);

  const steps: DivisionStep[] = [];
  const workingSteps: DivisionWorkingStep[] = [];
  let stepId = 0;

  let currentNumber = 0;
  let dividendIndex = 0;
  let quotientIndex = 0;

  while (quotientIndex < quotientDigits.length) {
    while (currentNumber < divisor && dividendIndex < dividendDigits.length) {
      currentNumber = currentNumber * 10 + dividendDigits[dividendIndex];
      dividendIndex++;
    }

    const qDigit = quotientDigits[quotientIndex];
    const multiplyResult = divisor * qDigit;
    const subtractResult = currentNumber - multiplyResult;

    workingSteps.push({
      currentNumber,
      quotientDigit: qDigit,
      multiplyResult,
      subtractResult,
      broughtDown: dividendIndex < dividendDigits.length ? dividendDigits[dividendIndex] : undefined,
    });

    steps.push({
      id: `step-${stepId++}`,
      type: 'quotient_digit',
      position: quotientIndex,
      expectedValue: qDigit,
      isCompleted: false,
      userValue: null,
    });

    const multiplyDigits = getDigitsLTR(multiplyResult);
    multiplyDigits.forEach((digit, idx) => {
      steps.push({
        id: `step-${stepId++}`,
        type: 'multiply_result',
        position: quotientIndex,
        digitPosition: idx,
        expectedValue: digit,
        isCompleted: false,
        userValue: null,
      });
    });

    if (subtractResult === 0 && dividendIndex >= dividendDigits.length) {
      steps.push({
        id: `step-${stepId++}`,
        type: 'subtract_result',
        position: quotientIndex,
        digitPosition: 0,
        expectedValue: 0,
        isCompleted: false,
        userValue: null,
      });
    } else if (subtractResult > 0 || dividendIndex < dividendDigits.length) {
      const subtractDigits = subtractResult === 0 ? [0] : getDigitsLTR(subtractResult);
      subtractDigits.forEach((digit, idx) => {
        steps.push({
          id: `step-${stepId++}`,
          type: 'subtract_result',
          position: quotientIndex,
          digitPosition: idx,
          expectedValue: digit,
          isCompleted: false,
          userValue: null,
        });
      });
    }

    currentNumber = subtractResult;
    quotientIndex++;
  }

  return { steps, workingSteps };
};

export const useColumnDivision = (difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
  const [state, setState] = useState<ColumnDivisionState>(() => {
    const problem = generateDivisionProblem(difficulty);
    const { steps, workingSteps } = calculateDivisionSteps(problem);
    return {
      problem,
      steps,
      currentStepIndex: 0,
      quotientDigits: [],
      workingSteps,
      currentWorkingStep: 0,
      userInputs: new Map(),
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

      const newUserInputs = new Map(prev.userInputs);
      newUserInputs.set(step.id, value);

      let newQuotientDigits = [...prev.quotientDigits];
      if (step.type === 'quotient_digit') {
        while (newQuotientDigits.length <= step.position) newQuotientDigits.push(null);
        newQuotientDigits[step.position] = value;
      }

      let newCurrentWorkingStep = prev.currentWorkingStep;
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex < prev.steps.length) {
        const nextStep = prev.steps[nextIndex];
        if (nextStep.type === 'quotient_digit' && nextStep.position > step.position) {
          newCurrentWorkingStep = nextStep.position;
        }
      }

      const isComplete = nextIndex >= prev.steps.length;

      return {
        ...prev,
        steps: newSteps,
        currentStepIndex: nextIndex,
        quotientDigits: newQuotientDigits,
        currentWorkingStep: newCurrentWorkingStep,
        userInputs: newUserInputs,
        isComplete,
      };
    });
  }, []);

  const reset = useCallback(
    (newDifficulty?: 'easy' | 'medium' | 'hard', problemOverride?: DivisionProblem) => {
      const problem = problemOverride ?? generateDivisionProblem(newDifficulty || difficulty);
      const { steps, workingSteps } = calculateDivisionSteps(problem);
      setState({
        problem,
        steps,
        currentStepIndex: 0,
        quotientDigits: [],
        workingSteps,
        currentWorkingStep: 0,
        userInputs: new Map(),
        isComplete: false,
        mistakesCount: 0,
      });
    },
    [difficulty],
  );

  return { state, currentStep, handleInput, reset };
};

