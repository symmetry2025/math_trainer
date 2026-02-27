import { ARITHMETIC_EQUATION_CONFIGS } from '../../../data/arithmeticEquationConfig';
import { MENTAL_MATH_CONFIGS } from '../../../data/mentalMathConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../../../data/numberCompositionConfig';
import { SUM_TABLE_CONFIGS } from '../../../data/sumTableConfig';
import { TABLE_FILL_CONFIGS } from '../../../data/tableFillConfig';
import { SUB_TABLE_CONFIGS } from '../../../data/subTableConfig';
import type { Operation } from './types';

export function exerciseHrefForOp(args: { op: Operation; basePath: string; exerciseId: string }): string | null {
  const exerciseId = String(args.exerciseId || '').trim();
  if (!exerciseId) return null;

  if (args.op === 'addition') {
    if (exerciseId === 'column-addition' || exerciseId.startsWith('column-add-')) {
      return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
    }
    if (
      Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId) ||
      Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId) ||
      Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId) ||
      Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId) ||
      Object.prototype.hasOwnProperty.call(SUM_TABLE_CONFIGS, exerciseId)
    ) {
      return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
    }
    return null;
  }

  if (args.op === 'subtraction') {
    if (exerciseId === 'column-subtraction') return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
    if (exerciseId.startsWith('column-sub-')) return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
    if (
      Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId) ||
      Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId) ||
      Object.prototype.hasOwnProperty.call(SUB_TABLE_CONFIGS, exerciseId)
    ) {
      return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
    }
    return null;
  }

  if (args.op === 'multiplication') {
    if (exerciseId === 'column-multiplication') return `${args.basePath}/column-multiplication`;
    if (exerciseId.startsWith('column-mul-')) return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
    if (/^mul-table-(\d+)$/.test(exerciseId) || exerciseId === 'mul-table-full' || exerciseId === 'mul-table-2-5') {
      return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
    }
    if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
    return null;
  }

  // division
  if (exerciseId === 'column-division' || exerciseId.startsWith('column-division-')) return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
  if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) return `${args.basePath}/${encodeURIComponent(exerciseId)}`;
  return null;
}

