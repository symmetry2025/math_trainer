export type TableFillTrainerConfig = {
  id: string;
  name: string;
  add: number;
  aValues: number[];
};

export const TABLE_FILL_CONFIGS: Record<string, TableFillTrainerConfig> = {
  'add-table-8': {
    id: 'add-table-8',
    name: 'Заполни таблицу',
    add: 8,
    // стартовый набор как в примере из учебника
    aValues: [8, 9, 12, 17, 36, 54],
  },
};

export function getTableFillConfig(exerciseId: string): TableFillTrainerConfig {
  const cfg = (TABLE_FILL_CONFIGS as any)[exerciseId];
  if (!cfg) throw new Error(`Unknown table fill config: ${exerciseId}`);
  return cfg as TableFillTrainerConfig;
}

