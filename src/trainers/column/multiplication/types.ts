export interface ColumnProblem {
  multiplicand: number; // верхнее число (например, 23)
  multiplier: number; // нижнее число (например, 45)
}

export interface InputStep {
  id: string;
  type: 'result' | 'carry' | 'sum_carry'; // перенос при умножении и перенос при сложении
  row: number; // 0..n-1 частичные результаты, -1 итог
  position: number; // позиция справа налево (0 = единицы)
  expectedValue: number;
  isCompleted: boolean;
  userValue: number | null;
}

export interface PartialProduct {
  value: number;
  digits: (number | null)[];
  offset: number;
}

export interface ColumnMultiplicationState {
  problem: ColumnProblem;
  steps: InputStep[];
  currentStepIndex: number;
  partialProducts: PartialProduct[];
  finalResult: (number | null)[];
  carries: Map<string, number | null>; // key: "row-position"
  sumCarries: Map<string, number | null>; // key: "position"
  allCarries: Map<string, number | null>; // все переносы умножения
  isComplete: boolean;
  mistakesCount: number;
}

