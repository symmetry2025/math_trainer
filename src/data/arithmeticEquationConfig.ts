// Конфигурация тренажёров “уравнения с пропуском” (например ? + 7 = 13)

export type ArithmeticEquationLevel = 'accuracy-choice' | 'accuracy-input' | 'speed' | 'race';

export interface ArithmeticEquationModeConfig {
  problems: number;
  timeLimit?: number; // для speed/race
}

export interface ArithmeticEquationRaceConfig {
  1: number;
  2: number;
  3: number;
}

export type ArithmeticEquationProblem =
  | {
      kind: 'add-missing-addend';
      sum: number;
      known: number;
      unknownPosition: 'left' | 'right';
      answer: number;
    }
  | {
      // ? − b = diff (unknown minuend)
      kind: 'sub-missing-minuend';
      subtrahend: number;
      difference: number;
      answer: number; // minuend
    }
  | {
      // a − ? = diff (unknown subtrahend)
      kind: 'sub-missing-subtrahend';
      minuend: number;
      difference: number;
      answer: number; // subtrahend
    };

export interface ArithmeticEquationTrainerConfig {
  id: string;
  name: string;
  shortName: string;
  generator: () => ArithmeticEquationProblem;
  levels: Record<ArithmeticEquationLevel, ArithmeticEquationModeConfig>;
  npcSpeeds: ArithmeticEquationRaceConfig;
}

function randInt(min: number, max: number) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  if (b < a) return a;
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function makeAddMissingAddendGenerator(limit: 10 | 20 | 50) {
  return (): ArithmeticEquationProblem => {
    // choose sum in [2..limit], known in [1..sum-1], answer = sum-known
    const sum = randInt(2, limit);
    const known = randInt(1, sum - 1);
    const answer = sum - known;
    const unknownPosition: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
    return { kind: 'add-missing-addend', sum, known, unknownPosition, answer };
  };
}

function makeSubMissingMinuendGenerator(limit: 10 | 20 | 50 | 100) {
  return (): ArithmeticEquationProblem => {
    // Pick minuend in [2..limit], subtrahend in [1..minuend-1], diff=minuend-subtrahend
    const minuend = randInt(2, limit);
    const subtrahend = randInt(1, minuend - 1);
    const difference = minuend - subtrahend;
    return { kind: 'sub-missing-minuend', subtrahend, difference, answer: minuend };
  };
}

function makeSubMissingSubtrahendGenerator(limit: 10 | 20 | 50 | 100) {
  return (): ArithmeticEquationProblem => {
    const minuend = randInt(2, limit);
    const subtrahend = randInt(1, minuend - 1);
    const difference = minuend - subtrahend;
    return { kind: 'sub-missing-subtrahend', minuend, difference, answer: subtrahend };
  };
}

export const ARITHMETIC_EQUATION_CONFIGS: Record<string, ArithmeticEquationTrainerConfig> = {
  'add-missing-addend-10': {
    id: 'add-missing-addend-10',
    name: 'Найти слагаемое (до 10)',
    shortName: 'Слагаемое ≤10',
    generator: makeAddMissingAddendGenerator(10),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10, timeLimit: 60 },
    },
    npcSpeeds: { 1: 7, 2: 5, 3: 4 },
  },
  'add-missing-addend-20': {
    id: 'add-missing-addend-20',
    name: 'Найти слагаемое (до 20)',
    shortName: 'Слагаемое ≤20',
    generator: makeAddMissingAddendGenerator(20),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 75 },
      race: { problems: 10, timeLimit: 75 },
    },
    npcSpeeds: { 1: 9, 2: 7, 3: 5 },
  },
  'add-missing-addend-50': {
    id: 'add-missing-addend-50',
    name: 'Найти слагаемое (до 50)',
    shortName: 'Слагаемое ≤50',
    generator: makeAddMissingAddendGenerator(50),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10, timeLimit: 90 },
    },
    npcSpeeds: { 1: 11, 2: 8, 3: 6 },
  },
  'sub-missing-minuend-10': {
    id: 'sub-missing-minuend-10',
    name: 'Найти уменьшаемое (до 10)',
    shortName: 'Уменьш. ≤10',
    generator: makeSubMissingMinuendGenerator(10),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10, timeLimit: 60 },
    },
    npcSpeeds: { 1: 8, 2: 6, 3: 5 },
  },
  'sub-missing-subtrahend-10': {
    id: 'sub-missing-subtrahend-10',
    name: 'Найти вычитаемое (до 10)',
    shortName: 'Вычит. ≤10',
    generator: makeSubMissingSubtrahendGenerator(10),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10, timeLimit: 60 },
    },
    npcSpeeds: { 1: 8, 2: 6, 3: 5 },
  },
  'sub-missing-minuend-20': {
    id: 'sub-missing-minuend-20',
    name: 'Найти уменьшаемое (до 20)',
    shortName: 'Уменьш. ≤20',
    generator: makeSubMissingMinuendGenerator(20),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 75 },
      race: { problems: 10, timeLimit: 75 },
    },
    npcSpeeds: { 1: 10, 2: 8, 3: 6 },
  },
  'sub-missing-subtrahend-20': {
    id: 'sub-missing-subtrahend-20',
    name: 'Найти вычитаемое (до 20)',
    shortName: 'Вычит. ≤20',
    generator: makeSubMissingSubtrahendGenerator(20),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 75 },
      race: { problems: 10, timeLimit: 75 },
    },
    npcSpeeds: { 1: 10, 2: 8, 3: 6 },
  },
  'sub-missing-minuend-50': {
    id: 'sub-missing-minuend-50',
    name: 'Найти уменьшаемое (до 50)',
    shortName: 'Уменьш. ≤50',
    generator: makeSubMissingMinuendGenerator(50),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10, timeLimit: 90 },
    },
    npcSpeeds: { 1: 12, 2: 9, 3: 7 },
  },
  'sub-missing-subtrahend-50': {
    id: 'sub-missing-subtrahend-50',
    name: 'Найти вычитаемое (до 50)',
    shortName: 'Вычит. ≤50',
    generator: makeSubMissingSubtrahendGenerator(50),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10, timeLimit: 90 },
    },
    npcSpeeds: { 1: 12, 2: 9, 3: 7 },
  },
  'sub-missing-minuend-100': {
    id: 'sub-missing-minuend-100',
    name: 'Найти уменьшаемое (до 100)',
    shortName: 'Уменьш. ≤100',
    generator: makeSubMissingMinuendGenerator(100),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 120 },
      race: { problems: 10, timeLimit: 120 },
    },
    npcSpeeds: { 1: 14, 2: 11, 3: 9 },
  },
  'sub-missing-subtrahend-100': {
    id: 'sub-missing-subtrahend-100',
    name: 'Найти вычитаемое (до 100)',
    shortName: 'Вычит. ≤100',
    generator: makeSubMissingSubtrahendGenerator(100),
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 120 },
      race: { problems: 10, timeLimit: 120 },
    },
    npcSpeeds: { 1: 14, 2: 11, 3: 9 },
  },
};

export const getArithmeticEquationConfig = (trainerId: string): ArithmeticEquationTrainerConfig => {
  const config = ARITHMETIC_EQUATION_CONFIGS[trainerId];
  if (!config) throw new Error(`Arithmetic equation trainer config not found: ${trainerId}`);
  return config;
};

