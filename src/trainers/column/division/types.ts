export interface DivisionProblem {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
}

export interface DivisionStep {
  id: string;
  type: 'quotient_digit' | 'multiply_result' | 'subtract_result' | 'bring_down';
  position: number;
  digitPosition?: number;
  expectedValue: number;
  isCompleted: boolean;
  userValue: number | null;
}

export interface DivisionWorkingStep {
  currentNumber: number;
  quotientDigit: number;
  multiplyResult: number;
  subtractResult: number;
  broughtDown?: number;
}

export interface ColumnDivisionState {
  problem: DivisionProblem;
  steps: DivisionStep[];
  currentStepIndex: number;
  quotientDigits: (number | null)[];
  workingSteps: DivisionWorkingStep[];
  currentWorkingStep: number;
  userInputs: Map<string, number>;
  isComplete: boolean;
  mistakesCount: number;
}

