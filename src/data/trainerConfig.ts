// Централизованная конфигурация тренажёров (уровни + звёзды/гонка)

export interface ModeConfig {
  problems: number; // количество примеров
}

export interface RaceNpcConfig {
  2: number; // секунд на пример для 2 звёзд (Знаток)
  3: number; // секунд на пример для 3 звёзд (Мастер)
}

export interface TrainerConfig {
  id: string;
  name: string;
  training: ModeConfig;
  accuracy: ModeConfig;
  race: ModeConfig;
  npcSpeeds: RaceNpcConfig;
}

export const OPPONENT_NAMES: Record<2 | 3, string> = {
  2: 'Знаток',
  3: 'Мастер',
};

const TRAINER_CONFIGS: Record<string, TrainerConfig> = {
  'column-addition': {
    id: 'column-addition',
    name: 'Сложение в столбик',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  // Grade-2 column addition variants (separate exercises with their own progress)
  'column-add-2d-1d-no-carry': {
    id: 'column-add-2d-1d-no-carry',
    name: 'Двухзначное и однозначное — без перехода',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  'column-add-2d-1d-carry': {
    id: 'column-add-2d-1d-carry',
    name: 'Двухзначное и однозначное — с переходом',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  'column-add-2d-2d-no-carry': {
    id: 'column-add-2d-2d-no-carry',
    name: 'Двухзначное и двухзначное — без перехода',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  'column-add-2d-2d-carry': {
    id: 'column-add-2d-2d-carry',
    name: 'Двухзначное и двухзначное — с переходом',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  // Grade-3 column addition variants (within 1000)
  'column-add-3d-2d': {
    id: 'column-add-3d-2d',
    name: 'Трёхзначное и двузначное — до 1000',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 12, 3: 9 },
  },
  'column-add-3d-3d': {
    id: 'column-add-3d-3d',
    name: 'Сумма трёхзначных — до 1000',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 14, 3: 10 },
  },
  'column-subtraction': {
    id: 'column-subtraction',
    name: 'Вычитание в столбик',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  // Grade-2 column subtraction variants (separate exercises with their own progress)
  'column-sub-2d-1d-no-borrow': {
    id: 'column-sub-2d-1d-no-borrow',
    name: 'Двухзначное и однозначное — без заёма',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  'column-sub-2d-2d-no-borrow': {
    id: 'column-sub-2d-2d-no-borrow',
    name: 'Двухзначное и двухзначное — без заёма',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  'column-sub-2d-1d-borrow': {
    id: 'column-sub-2d-1d-borrow',
    name: 'Двухзначное и однозначное — с заёмом',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  'column-sub-2d-2d-borrow': {
    id: 'column-sub-2d-2d-borrow',
    name: 'Двухзначное и двухзначное — с заёмом',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 9, 3: 6 },
  },
  // Grade-3 column subtraction variants (within 1000)
  'column-sub-3d-2d': {
    id: 'column-sub-3d-2d',
    name: 'Трёхзначное и двузначное — до 1000',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 12, 3: 9 },
  },
  'column-sub-3d-3d': {
    id: 'column-sub-3d-3d',
    name: 'Разность трёхзначных — до 1000',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 14, 3: 10 },
  },
  'column-multiplication': {
    id: 'column-multiplication',
    name: 'Умножение в столбик',
    training: { problems: 8 },
    accuracy: { problems: 8 },
    race: { problems: 8 },
    npcSpeeds: { 2: 14, 3: 10 },
  },
  // Grade-2 column multiplication variant (2-digit × 1-digit)
  'column-mul-2d-1d': {
    id: 'column-mul-2d-1d',
    name: 'Двухзначное × однозначное — в столбик',
    training: { problems: 10 },
    accuracy: { problems: 10 },
    race: { problems: 10 },
    npcSpeeds: { 2: 11, 3: 8 },
  },
  // Grade-3 column multiplication variants
  'column-mul-2d-2d': {
    id: 'column-mul-2d-2d',
    name: 'Двухзначное × двухзначное — в столбик',
    training: { problems: 8 },
    accuracy: { problems: 8 },
    race: { problems: 8 },
    npcSpeeds: { 2: 16, 3: 12 },
  },
  'column-mul-3d-2d': {
    id: 'column-mul-3d-2d',
    name: 'Трёхзначное × двухзначное — в столбик',
    training: { problems: 6 },
    accuracy: { problems: 6 },
    race: { problems: 6 },
    npcSpeeds: { 2: 22, 3: 16 },
  },
  'column-division': {
    id: 'column-division',
    name: 'Деление в столбик',
    training: { problems: 8 },
    accuracy: { problems: 8 },
    race: { problems: 8 },
    npcSpeeds: { 2: 16, 3: 12 },
  },
  // Grade-3 column division variants
  'column-division-2d-1d': {
    id: 'column-division-2d-1d',
    name: 'Двузначное ÷ однозначное — в столбик',
    training: { problems: 8 },
    accuracy: { problems: 8 },
    race: { problems: 8 },
    npcSpeeds: { 2: 16, 3: 12 },
  },
  'column-division-3d-2d': {
    id: 'column-division-3d-2d',
    name: 'Трёхзначное ÷ двузначное — в столбик',
    training: { problems: 6 },
    accuracy: { problems: 6 },
    race: { problems: 6 },
    npcSpeeds: { 2: 22, 3: 16 },
  },
};

export const getTrainerConfig = (trainerId: string): TrainerConfig => {
  const config = TRAINER_CONFIGS[trainerId];
  if (!config) throw new Error(`Trainer config not found: ${trainerId}`);
  return config;
};

