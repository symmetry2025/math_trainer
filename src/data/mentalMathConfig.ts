// Конфигурация тренажёров устного счёта (уровни + скорость/гонка)

export type MentalMathLevel = 'accuracy-choice' | 'accuracy-input' | 'speed' | 'race';

export interface MentalMathModeConfig {
  problems: number;
  timeLimit?: number; // для speed
}

export interface MentalMathRaceConfig {
  1: number;
  2: number;
  3: number;
}

export type ProblemType = 'addition' | 'subtraction';

export interface MentalMathTrainerConfig {
  id: string;
  name: string;
  shortName: string;
  problemType: ProblemType;
  generator: () => { a: number; b: number; answer: number };
  levels: Record<MentalMathLevel, MentalMathModeConfig>;
  npcSpeeds: MentalMathRaceConfig;
}

export const MENTAL_MATH_OPPONENT_NAMES: Record<number, string> = {
  1: 'Новичок',
  2: 'Знаток',
  3: 'Мастер',
};

function randInt(min: number, max: number) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  if (b < a) return a;
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

const generators = {
  additionWithin10: () => {
    const a = randInt(1, 9); // 1-9
    const maxB = Math.min(9, 10 - a);
    const b = randInt(1, maxB);
    return { a, b, answer: a + b };
  },
  additionCrossTen: () => {
    const a = randInt(2, 9); // 2-9
    const minB = 11 - a;
    const maxB = Math.min(9, 20 - a);
    if (minB > maxB) return { a: 9, b: 2, answer: 11 };
    const b = randInt(minB, maxB);
    return { a, b, answer: a + b };
  },
  additionWithin20NoCarry: () => {
    // 10..19 + 1..9 with no carry and sum <= 20
    for (let i = 0; i < 200; i++) {
      const a = randInt(10, 19);
      const units = a % 10;
      const maxBByNoCarry = Math.max(0, 9 - units);
      const maxBBySum = 20 - a;
      const maxB = Math.min(9, maxBByNoCarry, maxBBySum);
      if (maxB < 1) continue;
      const b = randInt(1, maxB);
      return { a, b, answer: a + b };
    }
    // fallback safe example
    return { a: 13, b: 4, answer: 17 };
  },
  additionToRoundTen: () => {
    // Требование: к ДВУХЗНАЧНОМУ числу прибавляется КРУГЛОЕ (10/20/30/...) число.
    // Держим результат в пределах 99, чтобы оставаться в рамках начальной школы.
    for (let i = 0; i < 400; i++) {
      const a = randInt(10, 89); // двухзначное
      const maxB = 99 - a;
      const maxTens = Math.min(90, Math.floor(maxB / 10) * 10);
      if (maxTens < 10) continue;
      const tens = randInt(1, maxTens / 10);
      const b = tens * 10;
      return { a, b, answer: a + b };
    }
    return { a: 36, b: 40, answer: 76 };
  },
  addition2dPlus1dNoCarry: () => {
    // 10..99 + 1..9, no carry, keep result <= 99
    for (let i = 0; i < 400; i++) {
      const a = randInt(10, 98);
      const units = a % 10;
      const maxB = Math.min(9, 9 - units, 99 - a);
      if (maxB < 1) continue;
      const b = randInt(1, maxB);
      return { a, b, answer: a + b };
    }
    return { a: 34, b: 5, answer: 39 };
  },
  addition2dPlus1dCarry: () => {
    // 10..99 + 1..9, carry, keep result <= 99
    for (let i = 0; i < 600; i++) {
      const a = randInt(10, 98);
      const units = a % 10;
      const minB = Math.max(1, 10 - units);
      const maxB = Math.min(9, 99 - a);
      if (minB > maxB) continue;
      const b = randInt(minB, maxB);
      if (units + b < 10) continue;
      return { a, b, answer: a + b };
    }
    return { a: 38, b: 5, answer: 43 };
  },
  addition2dPlus2dNoCarry: () => {
    // 10..99 + 10..99, no carry in units, keep result <= 99
    for (let i = 0; i < 800; i++) {
      const a = randInt(10, 89);
      const b = randInt(10, 89);
      const au = a % 10;
      const bu = b % 10;
      if (au + bu >= 10) continue;
      if (a + b > 99) continue;
      return { a, b, answer: a + b };
    }
    return { a: 23, b: 14, answer: 37 };
  },
  addition2dPlus2dCarry: () => {
    // 10..99 + 10..99, carry in units, keep result <= 99
    for (let i = 0; i < 1200; i++) {
      const a = randInt(10, 89);
      const b = randInt(10, 89);
      const au = a % 10;
      const bu = b % 10;
      if (au + bu < 10) continue;
      if (a + b > 99) continue;
      return { a, b, answer: a + b };
    }
    return { a: 27, b: 18, answer: 45 };
  },
  addition2dPlus2dOneRoundWithin100: () => {
    // 10..99 + (10/20/30/...) with sum <= 100. Prefer non-trivial second addend (not also round).
    for (let i = 0; i < 600; i++) {
      const bT = randInt(1, 8); // 10..80 so that the other number can remain 2-digit
      const b = bT * 10;
      const maxA = 100 - b;
      if (maxA < 10) continue;
      const a = randInt(10, Math.min(99, maxA));
      if (a % 10 === 0) continue; // keep it interesting: only one addend is round
      return { a, b, answer: a + b };
    }
    return { a: 23, b: 40, answer: 63 };
  },
  addition2dPlus2dNoCarryWithin100: () => {
    // 10..99 + 10..99, no carry in units, sum <= 100
    for (let i = 0; i < 1200; i++) {
      const a = randInt(10, 99);
      const b = randInt(10, 99);
      const au = a % 10;
      const bu = b % 10;
      if (au + bu >= 10) continue;
      if (a + b > 100) continue;
      return { a, b, answer: a + b };
    }
    return { a: 34, b: 25, answer: 59 };
  },
  addition2dPlus2dCarryWithin100: () => {
    for (let i = 0; i < 1200; i++) {
      const aT = randInt(1, 9);
      const aO = randInt(1, 9); // avoid 0 so carry is possible
      const bO = randInt(10 - aO, 9); // carry guaranteed
      const sO = aO + bO; // 10..18
      const maxTensSum = Math.floor((100 - sO) / 10); // 8..9
      const maxBT = Math.min(9, maxTensSum - aT);
      if (maxBT < 1) continue;
      const bT = randInt(1, maxBT);
      const a = aT * 10 + aO;
      const b = bT * 10 + bO;
      const total = a + b;
      if (total > 100) continue;
      if (total % 10 === 0) continue;
      return { a, b, answer: total };
    }
    return { a: 53, b: 47, answer: 100 };
  },
  addition2dPlus2dToRoundTenWithin100: () => {
    // Два двузначных. Единицы в сумме дают 10 => результат круглое число (кратно 10), и <= 100.
    // Пример: 23 + 47 = 70 (3+7=10).
    // Чтобы избежать перекоса к 80/90/100, сначала равномерно выбираем целевую сумму (кратную 10),
    // затем подбираем десятки/единицы.
    const targets = [30, 40, 50, 60, 70, 80, 90, 100];
    for (let i = 0; i < 1200; i++) {
      const total = targets[randInt(0, targets.length - 1)]!;
      const s = total / 10 - 1; // aT + bT
      if (s < 2 || s > 9) continue;

      const aO = randInt(1, 9);
      const bO = 10 - aO; // 1..9

      const minAT = Math.max(1, s - 9);
      const maxAT = Math.min(9, s - 1);
      if (minAT > maxAT) continue;
      const aT = randInt(minAT, maxAT);
      const bT = s - aT;
      if (bT < 1 || bT > 9) continue;

      const a = aT * 10 + aO;
      const b = bT * 10 + bO;
      return { a, b, answer: total };
    }
    return { a: 23, b: 47, answer: 70 };
  },
  additionWithZero: () => {
    const flip = Math.random() < 0.5;
    if (flip) {
      const a = randInt(0, 99);
      return { a, b: 0, answer: a };
    }
    const b = randInt(0, 99);
    return { a: 0, b, answer: b };
  },
  addition3dRoundPlus2d: () => {
    // 3-digit round (ends with 0) + 2-digit, sum <= 999
    for (let i = 0; i < 800; i++) {
      const aH = randInt(1, 9);
      const aT = randInt(0, 9);
      const a = aH * 100 + aT * 10; // ...0
      const maxB = 999 - a;
      if (maxB < 10) continue;
      const b = randInt(10, Math.min(99, maxB));
      return { a, b, answer: a + b };
    }
    return { a: 340, b: 57, answer: 397 };
  },
  addition3dPlus3dBothRound: () => {
    // both 3-digit, both round (end with 0), sum <= 999
    for (let i = 0; i < 1200; i++) {
      const aH = randInt(1, 9);
      const aT = randInt(0, 9);
      const a = aH * 100 + aT * 10;
      const maxB = 999 - a;
      if (maxB < 100) continue;
      const bH = randInt(1, Math.min(9, Math.floor(maxB / 100)));
      const bT = randInt(0, 9);
      const b = bH * 100 + bT * 10;
      if (a + b > 999) continue;
      return { a, b, answer: a + b };
    }
    return { a: 250, b: 430, answer: 680 };
  },
  addition3dPlus3dOneRound: () => {
    // two 3-digit; exactly one is round (end with 0); sum <= 999
    for (let i = 0; i < 1600; i++) {
      const roundFirst = Math.random() < 0.5;
      const a = roundFirst
        ? randInt(10, 99) * 10 // 100..990, ends with 0
        : randInt(100, 999);
      const b = roundFirst ? randInt(100, 999) : randInt(10, 99) * 10;
      if (a % 10 === 0 && b % 10 === 0) continue;
      if (a % 10 !== 0 && b % 10 !== 0) continue;
      if (a + b > 999) continue;
      if (a < 100 || b < 100) continue;
      return { a, b, answer: a + b };
    }
    return { a: 420, b: 358, answer: 778 };
  },
  addition3dPlus3dNoCarry: () => {
    // no carry in ones/tens/hundreds, sum <= 999
    for (let i = 0; i < 1200; i++) {
      const aH = randInt(1, 9);
      const bH = randInt(1, 9 - aH); // hundreds sum < 10
      const aT = randInt(0, 9);
      const bT = randInt(0, 9 - aT); // tens sum < 10
      const aO = randInt(0, 9);
      const bO = randInt(0, 9 - aO); // ones sum < 10
      const a = aH * 100 + aT * 10 + aO;
      const b = bH * 100 + bT * 10 + bO;
      const total = a + b;
      if (total > 999) continue;
      return { a, b, answer: total };
    }
    return { a: 324, b: 215, answer: 539 };
  },
  addition3dPlus3dCarry: () => {
    // at least one carry (force ones carry), sum <= 999
    for (let i = 0; i < 2000; i++) {
      const aH = randInt(1, 8);
      const bH = randInt(1, 8 - aH); // leave room for possible carry into hundreds
      const aT = randInt(0, 9);
      const bT = randInt(0, 9);
      const aO = randInt(1, 9);
      const bO = randInt(10 - aO, 9); // ones carry guaranteed
      const a = aH * 100 + aT * 10 + aO;
      const b = bH * 100 + bT * 10 + bO;
      const total = a + b;
      if (total > 999) continue;
      if ((aO + bO) < 10) continue;
      return { a, b, answer: total };
    }
    return { a: 478, b: 356, answer: 834 };
  },
  subtractionWithin10: () => {
    const a = randInt(2, 10); // 2-10
    const b = randInt(1, a - 1);
    return { a, b, answer: a - b };
  },
  subtractionCrossTen: () => {
    const a = randInt(11, 18); // 11-18
    const unitsA = a % 10;
    const minB = unitsA + 1;
    const maxB = Math.min(9, a - 1);
    if (minB > maxB) return { a: 15, b: 7, answer: 8 };
    const b = randInt(minB, maxB);
    return { a, b, answer: a - b };
  },
  subtractionToRoundTen: () => {
    // Требование: всегда ответ 10, но сразу "в пределах 100".
    // Генерация: a = b + 10, a <= 100 → b ∈ [1..90]
    // Примеры: 15-5, 63-53, 100-90 и т.д.
    const b = randInt(1, 90);
    const a = b + 10;
    return { a, b, answer: 10 };
  },
  subtraction20_2dMinus1d_NoBorrow: () => {
    // two-digit within 20, subtract one-digit without borrowing: 11..19 - 1..units
    const a = randInt(11, 19);
    const units = a % 10;
    const b = randInt(1, units);
    return { a, b, answer: a - b };
  },
  subtraction2d2dRoundTens: () => {
    // 20..90 step 10 minus 10..(a-10) step 10, result round tens
    const aT = randInt(2, 9);
    const bT = randInt(1, aT - 1);
    const a = aT * 10;
    const b = bT * 10;
    return { a, b, answer: a - b };
  },
  subtraction2d2dNoBorrow: () => {
    // two-digit - two-digit without borrowing: unitsA >= unitsB, a > b
    for (let i = 0; i < 800; i++) {
      const aT = randInt(2, 9);
      const aU = randInt(0, 9);
      const bT = randInt(1, aT); // allow same tens
      const bU = randInt(0, aU); // no borrow
      const a = aT * 10 + aU;
      const b = bT * 10 + bU;
      if (b >= a) continue;
      return { a, b, answer: a - b };
    }
    return { a: 53, b: 21, answer: 32 };
  },
  subtraction2d2dBorrow: () => {
    // two-digit - two-digit with borrowing: unitsA < unitsB, and a > b
    for (let i = 0; i < 800; i++) {
      const aT = randInt(2, 9);
      const aU = randInt(0, 8);
      const bT = randInt(1, aT - 1); // ensure b < a even after borrow
      const bU = randInt(aU + 1, 9); // force borrow
      const a = aT * 10 + aU;
      const b = bT * 10 + bU;
      if (b >= a) continue;
      return { a, b, answer: a - b };
    }
    return { a: 42, b: 17, answer: 25 };
  },
  additionWithin50: () => {
    const a = randInt(1, 49);
    const maxB = Math.min(49, 50 - a);
    const b = randInt(1, maxB);
    return { a, b, answer: a + b };
  },
  subtractionWithin50: () => {
    const a = randInt(2, 50);
    const b = randInt(1, a - 1);
    return { a, b, answer: a - b };
  },
};

export const MENTAL_MATH_CONFIGS: Record<string, MentalMathTrainerConfig> = {
  'add-10': {
    id: 'add-10',
    name: 'Сложение до 10',
    shortName: 'До 10',
    problemType: 'addition',
    generator: generators.additionWithin10,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 6, 2: 4, 3: 3 },
  },
  'add-20': {
    id: 'add-20',
    name: 'Сложение до 20 (с переходом)',
    shortName: 'Переход через 10',
    problemType: 'addition',
    generator: generators.additionCrossTen,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 8, 2: 5, 3: 4 },
  },
  'add-20-no-carry': {
    id: 'add-20-no-carry',
    name: 'Сложение до 20 (без перехода)',
    shortName: 'До 20 (без перехода)',
    problemType: 'addition',
    generator: generators.additionWithin20NoCarry,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 7, 2: 5, 3: 4 },
  },
  'add-to-round-ten': {
    id: 'add-to-round-ten',
    name: 'Сложение с круглым',
    shortName: 'К круглому',
    problemType: 'addition',
    generator: generators.additionToRoundTen,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 7, 2: 5, 3: 4 },
  },
  'add-2d-1d-no-carry': {
    id: 'add-2d-1d-no-carry',
    name: 'Двухзначное и однозначное (без перехода)',
    shortName: '2з+1з (без)',
    problemType: 'addition',
    generator: generators.addition2dPlus1dNoCarry,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 75 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 9, 2: 7, 3: 5 },
  },
  'add-2d-1d-carry': {
    id: 'add-2d-1d-carry',
    name: 'Двухзначное и однозначное (с переходом)',
    shortName: '2з+1з (с)',
    problemType: 'addition',
    generator: generators.addition2dPlus1dCarry,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 75 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 10, 2: 8, 3: 6 },
  },
  'add-2d-2d-no-carry': {
    id: 'add-2d-2d-no-carry',
    name: 'Двухзначные (без перехода)',
    shortName: '2з+2з (без)',
    problemType: 'addition',
    generator: generators.addition2dPlus2dNoCarry,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 12, 2: 9, 3: 7 },
  },
  'add-2d-2d-carry': {
    id: 'add-2d-2d-carry',
    name: 'Двухзначные (с переходом)',
    shortName: '2з+2з (с)',
    problemType: 'addition',
    generator: generators.addition2dPlus2dCarry,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 13, 2: 10, 3: 8 },
  },
  'add-2d-2d-one-round': {
    id: 'add-2d-2d-one-round',
    name: 'Сумма двухзначных (одно круглое) — до 100',
    shortName: '2з+кругл.',
    problemType: 'addition',
    generator: generators.addition2dPlus2dOneRoundWithin100,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 12, 2: 9, 3: 7 },
  },
  'add-2d-2d-no-carry-100': {
    id: 'add-2d-2d-no-carry-100',
    name: 'Сумма двухзначных (без перехода) — до 100',
    shortName: '2з+2з≤100 (без)',
    problemType: 'addition',
    generator: generators.addition2dPlus2dNoCarryWithin100,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 12, 2: 9, 3: 7 },
  },
  'add-2d-2d-carry-100': {
    id: 'add-2d-2d-carry-100',
    name: 'Сумма двухзначных (с переходом) — до 100',
    shortName: '2з+2з≤100 (с)',
    problemType: 'addition',
    generator: generators.addition2dPlus2dCarryWithin100,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 13, 2: 10, 3: 8 },
  },
  'add-2d-2d-to-round': {
    id: 'add-2d-2d-to-round',
    name: 'Сумма двухзначных (до круглого) — до 100',
    shortName: '2з→кругл.',
    problemType: 'addition',
    generator: generators.addition2dPlus2dToRoundTenWithin100,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 12, 2: 9, 3: 7 },
  },
  'add-zero': {
    id: 'add-zero',
    name: 'Сложение с нулем',
    shortName: 'С нулём',
    problemType: 'addition',
    generator: generators.additionWithZero,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 7, 2: 5, 3: 4 },
  },
  'add-3d-round-2d': {
    id: 'add-3d-round-2d',
    name: 'Трёхзначное (круглое) и двузначное — до 1000',
    shortName: '3зкругл+2з',
    problemType: 'addition',
    generator: generators.addition3dRoundPlus2d,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 120 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 16, 2: 13, 3: 10 },
  },
  'add-3d-3d-round': {
    id: 'add-3d-3d-round',
    name: 'Сумма трёхзначных (оба круглые) — до 1000',
    shortName: '3зкругл+3зкругл',
    problemType: 'addition',
    generator: generators.addition3dPlus3dBothRound,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 120 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 18, 2: 15, 3: 12 },
  },
  'add-3d-3d-one-round': {
    id: 'add-3d-3d-one-round',
    name: 'Сумма трёхзначных (одно круглое) — до 1000',
    shortName: '3з+3зкругл',
    problemType: 'addition',
    generator: generators.addition3dPlus3dOneRound,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 120 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 18, 2: 15, 3: 12 },
  },
  'add-3d-3d-no-carry': {
    id: 'add-3d-3d-no-carry',
    name: 'Сумма трёхзначных (без перехода) — до 1000',
    shortName: '3з+3з (без)',
    problemType: 'addition',
    generator: generators.addition3dPlus3dNoCarry,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 120 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 17, 2: 14, 3: 11 },
  },
  'add-3d-3d-carry': {
    id: 'add-3d-3d-carry',
    name: 'Сумма трёхзначных (с переходом) — до 1000',
    shortName: '3з+3з (с)',
    problemType: 'addition',
    generator: generators.addition3dPlus3dCarry,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 120 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 18, 2: 15, 3: 12 },
  },
  'sub-10': {
    id: 'sub-10',
    name: 'Вычитание до 10',
    shortName: 'До 10',
    problemType: 'subtraction',
    generator: generators.subtractionWithin10,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 6, 2: 4, 3: 3 },
  },
  'sub-20': {
    id: 'sub-20',
    name: 'Вычитание до 20 (с переходом)',
    shortName: 'Переход через 10',
    problemType: 'subtraction',
    generator: generators.subtractionCrossTen,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 8, 2: 5, 3: 4 },
  },
  'sub-to-round-ten': {
    id: 'sub-to-round-ten',
    name: 'Вычитание до круглого',
    shortName: 'До круглого',
    problemType: 'subtraction',
    generator: generators.subtractionToRoundTen,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 75 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 9, 2: 7, 3: 5 },
  },
  'sub-20-2d-1d-no-borrow': {
    id: 'sub-20-2d-1d-no-borrow',
    name: 'Вычитание до 20',
    shortName: 'До 20 (без)',
    problemType: 'subtraction',
    generator: generators.subtraction20_2dMinus1d_NoBorrow,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 60 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 8, 2: 6, 3: 5 },
  },
  'sub-2d-2d-round': {
    id: 'sub-2d-2d-round',
    name: 'Двухзначные круглые',
    shortName: 'Круглые',
    problemType: 'subtraction',
    generator: generators.subtraction2d2dRoundTens,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 12, 2: 9, 3: 7 },
  },
  'sub-2d-2d-no-borrow': {
    id: 'sub-2d-2d-no-borrow',
    name: 'Двухзначные',
    shortName: 'Без перехода',
    problemType: 'subtraction',
    generator: generators.subtraction2d2dNoBorrow,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 13, 2: 10, 3: 8 },
  },
  'sub-2d-2d-borrow': {
    id: 'sub-2d-2d-borrow',
    name: 'Двухзначные',
    shortName: 'С переходом',
    problemType: 'subtraction',
    generator: generators.subtraction2d2dBorrow,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 14, 2: 11, 3: 9 },
  },
  'add-50': {
    id: 'add-50',
    name: 'Сложение в пределах 50',
    shortName: 'До 50',
    problemType: 'addition',
    generator: generators.additionWithin50,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 10, 2: 7, 3: 5 },
  },
  'sub-50': {
    id: 'sub-50',
    name: 'Вычитание в пределах 50',
    shortName: 'До 50',
    problemType: 'subtraction',
    generator: generators.subtractionWithin50,
    levels: {
      'accuracy-choice': { problems: 10 },
      'accuracy-input': { problems: 10 },
      speed: { problems: 10, timeLimit: 90 },
      race: { problems: 10 },
    },
    npcSpeeds: { 1: 10, 2: 7, 3: 5 },
  },
};

export const getMentalMathConfig = (trainerId: string): MentalMathTrainerConfig => {
  const config = MENTAL_MATH_CONFIGS[trainerId];
  if (!config) throw new Error(`Mental math trainer config not found: ${trainerId}`);
  return config;
};

export const generateOptions = (
  correctAnswer: number,
  count: number = 4,
  opts?: {
    min?: number;
    max?: number;
    /** optional fixed spread around correct (if provided, overrides auto spread) */
    spread?: number;
  },
): number[] => {
  const correct = Math.floor(Number(correctAnswer || 0));
  const targetCount = Math.max(2, Math.floor(Number(count || 4)));

  const autoSpread = Math.max(6, Math.min(80, Math.round(Math.max(10, Math.abs(correct)) * 0.2)));
  const spread = Math.max(6, Math.floor(Number(opts?.spread ?? autoSpread)));

  const min = Math.floor(Number(opts?.min ?? Math.max(0, correct - spread)));
  const max = Math.floor(Number(opts?.max ?? Math.max(min + 10, correct + spread)));

  const options = new Set<number>([correct]);
  let guard = 0;
  while (options.size < targetCount && guard++ < 300) {
    const wrong = correct + randInt(-spread, spread);
    if (!Number.isFinite(wrong)) continue;
    if (wrong < min || wrong > max) continue;
    if (wrong === correct) continue;
    options.add(wrong);
  }

  // Deterministic fallback fill (rare, but avoids infinite loops if min/max too tight).
  let bump = 1;
  while (options.size < targetCount) {
    const a = correct + bump;
    const b = correct - bump;
    if (a !== correct && a >= min && a <= max) options.add(a);
    if (options.size >= targetCount) break;
    if (b !== correct && b >= min && b <= max) options.add(b);
    bump++;
    if (bump > spread + 20) break;
  }

  return Array.from(options).sort(() => Math.random() - 0.5);
};

