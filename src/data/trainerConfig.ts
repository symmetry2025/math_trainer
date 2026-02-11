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
  'column-subtraction': {
    id: 'column-subtraction',
    name: 'Вычитание в столбик',
    accuracy: { problems: 10 },
    speed: { problems: 5, timeLimit: 60 },
    race: { problems: 10 },
    npcSpeeds: { 1: 12, 2: 9, 3: 6 },
  },
  'column-multiplication': {
    id: 'column-multiplication',
    name: 'Умножение в столбик',
    accuracy: { problems: 8 },
    speed: { problems: 4, timeLimit: 90 },
    race: { problems: 8 },
    npcSpeeds: { 1: 18, 2: 14, 3: 10 },
  },
  'column-division': {
    id: 'column-division',
    name: 'Деление в столбик',
    accuracy: { problems: 8 },
    speed: { problems: 4, timeLimit: 120 },
    race: { problems: 8 },
    npcSpeeds: { 1: 20, 2: 16, 3: 12 },
  },
};

export const getTrainerConfig = (trainerId: string): TrainerConfig => {
  const config = TRAINER_CONFIGS[trainerId];
  if (!config) throw new Error(`Trainer config not found: ${trainerId}`);
  return config;
};

