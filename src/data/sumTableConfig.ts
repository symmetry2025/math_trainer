export type SumTableKind = 'find-addend' | 'find-component' | 'substitute-letter';

export type SumTableTrainerConfig = {
  id: string;
  name: string;
  kind: SumTableKind;
  /** how many columns in the table (for substitute-letter: how many mini-tables) */
  columns: number;
  /** sum range */
  sumMin: number;
  sumMax: number;
  /** known addend range (the other addend is derived from sum) */
  knownMin: number;
  knownMax: number;
  /** letter to show for substitute-letter kind */
  letter?: string;
  /**
   * substitute-letter mode (mini-table):
   * - choose a concrete value for the letter in [letterValueMin..letterValueMax]
   * - choose 2 addends in [addMin..addMax]
   */
  letterValueMin?: number;
  letterValueMax?: number;
  addMin?: number;
  addMax?: number;
};

export const SUM_TABLE_CONFIGS: Record<string, SumTableTrainerConfig> = {
  'add-sumtable-find-addend': {
    id: 'add-sumtable-find-addend',
    name: 'Заполни таблицу — найди слагаемое',
    kind: 'find-addend',
    columns: 7,
    sumMin: 12,
    sumMax: 18,
    knownMin: 2,
    knownMax: 9,
  },
  'add-sumtable-find-component': {
    id: 'add-sumtable-find-component',
    name: 'Заполни таблицу — найди компонент суммы',
    kind: 'find-component',
    columns: 7,
    sumMin: 12,
    sumMax: 18,
    knownMin: 2,
    knownMax: 9,
  },
  'add-sumtable-letter': {
    id: 'add-sumtable-letter',
    name: 'Заполни таблицу — подставь вместо буквы',
    kind: 'substitute-letter',
    columns: 5, // 5 mini-tables → 10 примеров (2 ответа в каждой)
    // legacy fields are kept for compatibility; substitute-letter uses the extended fields below
    sumMin: 12,
    sumMax: 18,
    knownMin: 2,
    knownMax: 9,
    letter: 'a',
    letterValueMin: 2,
    letterValueMax: 20,
    addMin: 10,
    addMax: 90,
  },
};

export function getSumTableConfig(exerciseId: string): SumTableTrainerConfig {
  const cfg = (SUM_TABLE_CONFIGS as any)[exerciseId];
  if (!cfg) throw new Error(`Unknown sum table config: ${exerciseId}`);
  return cfg as SumTableTrainerConfig;
}

