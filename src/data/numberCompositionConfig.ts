export type NumberCompositionTrainerConfig = {
  id: string;
  name: string;
  /** Inclusive min sum (e.g. 2). */
  minSum: number;
  /** Inclusive max sum (e.g. 10). */
  maxSum: number;
  /** Visual variant: simple edges vs "house" (UI can evolve later). */
  variant?: 'compose' | 'house';
};

export const NUMBER_COMPOSITION_CONFIGS: Record<string, NumberCompositionTrainerConfig> = {
  'compose-2-4': { id: 'compose-2-4', name: 'Состав чисел 2-3-4', minSum: 2, maxSum: 4, variant: 'compose' },
  'compose-5-7': { id: 'compose-5-7', name: 'Состав чисел 5-6-7', minSum: 5, maxSum: 7, variant: 'compose' },
  'compose-8-9': { id: 'compose-8-9', name: 'Состав чисел 8-9', minSum: 8, maxSum: 9, variant: 'compose' },
  'compose-10': { id: 'compose-10', name: 'Состав числа 10', minSum: 10, maxSum: 10, variant: 'compose' },
  'house-2-4': { id: 'house-2-4', name: 'Домики чисел 2-3-4', minSum: 2, maxSum: 4, variant: 'house' },
  'house-5-7': { id: 'house-5-7', name: 'Домики чисел 5-6-7', minSum: 5, maxSum: 7, variant: 'house' },
  'house-8-9': { id: 'house-8-9', name: 'Домики чисел 8-9', minSum: 8, maxSum: 9, variant: 'house' },
  'house-10': { id: 'house-10', name: 'Домик числа 10', minSum: 10, maxSum: 10, variant: 'house' },
};

export function getNumberCompositionConfig(exerciseId: string): NumberCompositionTrainerConfig {
  const cfg = (NUMBER_COMPOSITION_CONFIGS as any)[exerciseId];
  if (!cfg) throw new Error(`Unknown number composition config: ${exerciseId}`);
  return cfg as NumberCompositionTrainerConfig;
}

