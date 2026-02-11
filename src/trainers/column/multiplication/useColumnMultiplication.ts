import { useCallback, useMemo, useState } from 'react';

import type { ColumnMultiplicationState, ColumnProblem, InputStep, PartialProduct } from './types';

export const generateProblem = (difficulty: 'easy' | 'medium' | 'hard'): ColumnProblem => {
  let multiplicand: number, multiplier: number;

  switch (difficulty) {
    case 'easy':
      multiplicand = Math.floor(Math.random() * 90) + 10; // 10-99
      multiplier = Math.floor(Math.random() * 9) + 2; // 2-10
      break;
    case 'medium':
      multiplicand = Math.floor(Math.random() * 90) + 10; // 10-99
      multiplier = Math.floor(Math.random() * 90) + 10; // 10-99
      break;
    case 'hard':
      multiplicand = Math.floor(Math.random() * 900) + 100; // 100-999
      multiplier = Math.floor(Math.random() * 90) + 10; // 10-99
      break;
  }

  return { multiplicand, multiplier };
};

const getDigits = (num: number): number[] => {
  return num.toString().split('').map(Number).reverse();
};

const calculateSteps = (problem: ColumnProblem): { steps: InputStep[]; partialProducts: PartialProduct[] } => {
  const { multiplicand, multiplier } = problem;
  const multiplicandDigits = getDigits(multiplicand);
  const multiplierDigits = getDigits(multiplier);

  const steps: InputStep[] = [];
  const partialProducts: PartialProduct[] = [];
  let stepId = 0;

  multiplierDigits.forEach((multiplierDigit, rowIndex) => {
    let carry = 0;
    const partialResult: number[] = [];

    multiplicandDigits.forEach((multiplicandDigit, colIndex) => {
      const product = multiplicandDigit * multiplierDigit + carry;
      const resultDigit = product % 10;
      const newCarry = Math.floor(product / 10);

      partialResult.push(resultDigit);

      steps.push({
        id: `step-${stepId++}`,
        type: 'result',
        row: rowIndex,
        position: colIndex,
        expectedValue: resultDigit,
        isCompleted: false,
        userValue: null,
      });

      if (newCarry > 0 && colIndex < multiplicandDigits.length - 1) {
        steps.push({
          id: `step-${stepId++}`,
          type: 'carry',
          row: rowIndex,
          position: colIndex + 1,
          expectedValue: newCarry,
          isCompleted: false,
          userValue: null,
        });
      }

      if (colIndex === multiplicandDigits.length - 1 && newCarry > 0) {
        partialResult.push(newCarry);
        steps.push({
          id: `step-${stepId++}`,
          type: 'result',
          row: rowIndex,
          position: colIndex + 1,
          expectedValue: newCarry,
          isCompleted: false,
          userValue: null,
        });
      }

      carry = newCarry;
    });

    partialProducts.push({
      value: multiplicand * multiplierDigit,
      digits: partialResult.map(() => null),
      offset: rowIndex,
    });
  });

  if (multiplierDigits.length > 1) {
    const totalResult = multiplicand * multiplier;
    const totalDigits = getDigits(totalResult);

    let sumCarry = 0;
    const partialValues = partialProducts.map((pp, idx) => ({ value: pp.value, offset: idx }));

    totalDigits.forEach((_digit, position) => {
      let columnSum = sumCarry;
      partialValues.forEach((pv) => {
        const effectivePosition = position - pv.offset;
        if (effectivePosition >= 0) {
          const ppDigits = getDigits(pv.value);
          if (effectivePosition < ppDigits.length) columnSum += ppDigits[effectivePosition];
        }
      });

      const resultDigit = columnSum % 10;
      const newCarry = Math.floor(columnSum / 10);

      steps.push({
        id: `step-${stepId++}`,
        type: 'result',
        row: -1,
        position,
        expectedValue: resultDigit,
        isCompleted: false,
        userValue: null,
      });

      if (newCarry > 0 && position < totalDigits.length - 1) {
        steps.push({
          id: `step-${stepId++}`,
          type: 'sum_carry',
          row: -1,
          position: position + 1,
          expectedValue: newCarry,
          isCompleted: false,
          userValue: null,
        });
      }

      sumCarry = newCarry;
    });
  }

  return { steps, partialProducts };
};

export const useColumnMultiplication = (difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
  const [state, setState] = useState<ColumnMultiplicationState>(() => {
    const problem = generateProblem(difficulty);
    const { steps, partialProducts } = calculateSteps(problem);
    return {
      problem,
      steps,
      currentStepIndex: 0,
      partialProducts,
      finalResult: [],
      carries: new Map(),
      sumCarries: new Map(),
      allCarries: new Map(),
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

      const newPartialProducts = [...prev.partialProducts];
      const newCarries = new Map(prev.carries);
      const newSumCarries = new Map(prev.sumCarries);
      const newAllCarries = new Map(prev.allCarries);

      if (step.type === 'result' && step.row >= 0) {
        newPartialProducts[step.row] = {
          ...newPartialProducts[step.row],
          digits: newPartialProducts[step.row].digits.map((d, i) => (i === step.position ? value : d)),
        };
      } else if (step.type === 'carry') {
        newCarries.set(`${step.row}-${step.position}`, value);
        newAllCarries.set(`${step.row}-${step.position}`, value);
      } else if (step.type === 'sum_carry') {
        newSumCarries.set(`${step.position}`, value);
      }

      let newFinalResult = [...prev.finalResult];
      if (step.row === -1 && step.type === 'result') {
        while (newFinalResult.length <= step.position) newFinalResult.push(null);
        newFinalResult[step.position] = value;
      }

      const nextIndex = prev.currentStepIndex + 1;
      const isComplete = nextIndex >= prev.steps.length;

      return {
        ...prev,
        steps: newSteps,
        currentStepIndex: nextIndex,
        partialProducts: newPartialProducts,
        carries: newCarries,
        sumCarries: newSumCarries,
        allCarries: newAllCarries,
        finalResult: newFinalResult,
        isComplete,
      };
    });
  }, []);

  const reset = useCallback(
    (newDifficulty?: 'easy' | 'medium' | 'hard', problemOverride?: ColumnProblem) => {
      const problem = problemOverride ?? generateProblem(newDifficulty || difficulty);
      const { steps, partialProducts } = calculateSteps(problem);
      setState({
        problem,
        steps,
        currentStepIndex: 0,
        partialProducts,
        finalResult: [],
        carries: new Map(),
        sumCarries: new Map(),
        allCarries: new Map(),
        isComplete: false,
        mistakesCount: 0,
      });
    },
    [difficulty],
  );

  return { state, currentStep, handleInput, reset };
};

