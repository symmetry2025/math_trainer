export interface AdditionProblem {
  numbers: number[]; // слагаемые
}

export interface AdditionInputStep {
  id: string;
  type: 'result' | 'carry';
  position: number; // позиция справа (0 = единицы)
  expectedValue: number;
  isCompleted: boolean;
  userValue: number | null;
}

export interface ColumnAdditionState {
  problem: AdditionProblem;
  steps: AdditionInputStep[];
  currentStepIndex: number;
  result: (number | null)[];
  carries: Map<string, number | null>; // key: "position"
  isComplete: boolean;
  mistakesCount: number;
}

