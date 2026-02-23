// Централизованная конфигурация тренажёров (уровни + звёзды/гонка)

export interface ModeConfig {
  problems: number; // количество примеров
  timeLimit?: number; // лимит времени в секундах (для speed)
}

export interface RaceNpcConfig {
  1: number; // секунд на пример для 1 звезды (Новичок)
  2: number; // секунд на пример для 2 звёзд (Знаток)
  3: number; // секунд на пример для 3 звёзд (Мастер)
}

export interface TrainerConfig {
  id: string;
  name: string;
  accuracy: ModeConfig;
  speed: ModeConfig;
  race: ModeConfig;
  npcSpeeds: RaceNpcConfig;
}

export const OPPONENT_NAMES: Record<number, string> = {
  1: 'Новичок',
  2: 'Знаток',
  3: 'Мастер',
};

const TRAINER_CONFIGS: Record<string, TrainerConfig> = {
  'column-addition': {
    id: 'column-addition',
    name: 'Сложение в столбик',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  // Grade-2 column addition variants (separate exercises with their own progress)
  'column-add-2d-1d-no-carry': {
    id: 'column-add-2d-1d-no-carry',
    name: 'Двухзначное и однозначное — без перехода',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  'column-add-2d-1d-carry': {
    id: 'column-add-2d-1d-carry',
    name: 'Двухзначное и однозначное — с переходом',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  'column-add-2d-2d-no-carry': {
    id: 'column-add-2d-2d-no-carry',
    name: 'Двухзначное и двухзначное — без перехода',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  'column-add-2d-2d-carry': {
    id: 'column-add-2d-2d-carry',
    name: 'Двухзначное и двухзначное — с переходом',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  // Grade-3 column addition variants (within 1000)
  'column-add-3d-2d': {
    id: 'column-add-3d-2d',
    name: 'Трёхзначное и двузначное — до 1000',
    accuracy: { problems: 10 },
    speed: { problems: 6, timeLimit: 90 },
    race: { problems: 10 },
    npcSpeeds: { 1: 16, 2: 12, 3: 9 },
  },
  'column-add-3d-3d': {
    id: 'column-add-3d-3d',
    name: 'Сумма трёхзначных — до 1000',
    accuracy: { problems: 10 },
    speed: { problems: 6, timeLimit: 90 },
    race: { problems: 10 },
    npcSpeeds: { 1: 18, 2: 14, 3: 10 },
  },
  'column-subtraction': {
    id: 'column-subtraction',
    name: 'Вычитание в столбик',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  // Grade-2 column subtraction variants (separate exercises with their own progress)
  'column-sub-2d-1d-no-borrow': {
    id: 'column-sub-2d-1d-no-borrow',
    name: 'Двухзначное и однозначное — без заёма',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  'column-sub-2d-2d-no-borrow': {
    id: 'column-sub-2d-2d-no-borrow',
    name: 'Двухзначное и двухзначное — без заёма',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  'column-sub-2d-1d-borrow': {
    id: 'column-sub-2d-1d-borrow',
    name: 'Двухзначное и однозначное — с заёмом',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  'column-sub-2d-2d-borrow': {
    id: 'column-sub-2d-2d-borrow',
    name: 'Двухзначное и двухзначное — с заёмом',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  // Grade-3 column subtraction variants (within 1000)
  'column-sub-3d-2d': {
    id: 'column-sub-3d-2d',
    name: 'Трёхзначное и двузначное — до 1000',
    accuracy: { problems: 10 },
    speed: { problems: 6, timeLimit: 90 },
    race: { problems: 10 },
    npcSpeeds: { 1: 16, 2: 12, 3: 9 },
  },
  'column-sub-3d-3d': {
    id: 'column-sub-3d-3d',
    name: 'Разность трёхзначных — до 1000',
    accuracy: { problems: 10 },
    speed: { problems: 6, timeLimit: 90 },
    race: { problems: 10 },
    npcSpeeds: { 1: 18, 2: 14, 3: 10 },
  },
  'column-multiplication': {
    id: 'column-multiplication',
    name: 'Умножение в столбик',
    accuracy: { problems: 8 },
    speed: { problems: 4, timeLimit: 90 },
    race: { problems: 8 },
    npcSpeeds: { 1: 18, 2: 14, 3: 10 },
  },
  // Grade-2 column multiplication variant (2-digit × 1-digit)
  'column-mul-2d-1d': {
    id: 'column-mul-2d-1d',
    name: 'Двухзначное × однозначное — в столбик',
    accuracy: { problems: 10 },
    speed: { problems: 6, timeLimit: 90 },
    race: { problems: 10 },
    npcSpeeds: { 1: 14, 2: 11, 3: 8 },
  },
  // Grade-3 column multiplication variants
  'column-mul-2d-2d': {
    id: 'column-mul-2d-2d',
    name: 'Двухзначное × двухзначное — в столбик',
    accuracy: { problems: 8 },
    speed: { problems: 4, timeLimit: 120 },
    race: { problems: 8 },
    npcSpeeds: { 1: 20, 2: 16, 3: 12 },
  },
  'column-mul-3d-2d': {
    id: 'column-mul-3d-2d',
    name: 'Трёхзначное × двухзначное — в столбик',
    accuracy: { problems: 6 },
    speed: { problems: 3, timeLimit: 180 },
    race: { problems: 6 },
    npcSpeeds: { 1: 28, 2: 22, 3: 16 },
  },
  'column-division': {
    id: 'column-division',
    name: 'Деление в столбик',
    accuracy: { problems: 8 },
    speed: { problems: 4, timeLimit: 120 },
    race: { problems: 8 },
    npcSpeeds: { 1: 20, 2: 16, 3: 12 },
  },
  // Grade-3 column division variants
  'column-division-2d-1d': {
    id: 'column-division-2d-1d',
    name: 'Двузначное ÷ однозначное — в столбик',
    accuracy: { problems: 8 },
    speed: { problems: 4, timeLimit: 120 },
    race: { problems: 8 },
    npcSpeeds: { 1: 20, 2: 16, 3: 12 },
  },
  'column-division-3d-2d': {
    id: 'column-division-3d-2d',
    name: 'Трёхзначное ÷ двузначное — в столбик',
    accuracy: { problems: 6 },
    speed: { problems: 3, timeLimit: 180 },
    race: { problems: 6 },
    npcSpeeds: { 1: 28, 2: 22, 3: 16 },
  },
};

export const getTrainerConfig = (trainerId: string): TrainerConfig => {
  const config = TRAINER_CONFIGS[trainerId];
  if (!config) throw new Error(`Trainer config not found: ${trainerId}`);
  return config;
};

