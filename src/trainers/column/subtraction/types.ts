export interface SubtractionProblem {
  minuend: number; // уменьшаемое
  subtrahend: number; // вычитаемое
}

export interface SubtractionInputStep {
  id: string;
  type: 'result' | 'borrow'; // borrow = заём
  position: number; // позиция справа (0 = единицы)
  expectedValue: number;
  isCompleted: boolean;
  userValue: number | null;
}

export interface ColumnSubtractionState {
  problem: SubtractionProblem;
  steps: SubtractionInputStep[];
  currentStepIndex: number;
  result: (number | null)[];
  borrows: Map<string, number | null>;
  isComplete: boolean;
  mistakesCount: number;
}

