export type SubTableKind = 'find-minuend' | 'find-subtrahend' | 'find-difference';

export type SubTableTrainerConfig = {
  id: string;
  name: string;
  kind: SubTableKind;
  /** how many columns in the table */
  columns: number;
  /** difference range */
  diffMin: number;
  diffMax: number;
  /** known component range (subtrahend) */
  knownMin: number;
  knownMax: number;
};

export const SUB_TABLE_CONFIGS: Record<string, SubTableTrainerConfig> = {
  'sub-sumtable-find-difference': {
    id: 'sub-sumtable-find-difference',
    name: 'Заполни таблицу — найди разность',
    kind: 'find-difference',
    columns: 7,
    diffMin: 12,
    diffMax: 18,
    knownMin: 2,
    knownMax: 9,
  },
  'sub-sumtable-find-subtrahend': {
    id: 'sub-sumtable-find-subtrahend',
    name: 'Заполни таблицу — найди вычитаемое',
    kind: 'find-subtrahend',
    columns: 7,
    diffMin: 12,
    diffMax: 18,
    knownMin: 2,
    knownMax: 9,
  },
  'sub-sumtable-find-minuend': {
    id: 'sub-sumtable-find-minuend',
    name: 'Заполни таблицу — найди уменьшаемое',
    kind: 'find-minuend',
    columns: 7,
    diffMin: 12,
    diffMax: 18,
    knownMin: 2,
    knownMax: 9,
  },
};

export function getSubTableConfig(exerciseId: string): SubTableTrainerConfig {
  const cfg = (SUB_TABLE_CONFIGS as any)[exerciseId];
  if (!cfg) throw new Error(`Unknown subtraction table config: ${exerciseId}`);
  return cfg as SubTableTrainerConfig;
}

