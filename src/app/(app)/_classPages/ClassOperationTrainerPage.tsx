'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

import type { Grade, Operation } from './types';
import { TrainerFlow } from '../../../trainerFlow/TrainerFlow';

// Addition deps
import ColumnAdditionSession from '../../../trainers/column/addition/ColumnAdditionSession';
import { makeMentalMathDefinition } from '../../../trainers/mental-math/mentalMathDefinition';
import { makeArithmeticEquationDefinition } from '../../../trainers/arithmetic-equation/arithmeticEquationDefinition';
import { makeColumnDefinition } from '../../../trainers/column/columnDefinition';
import { makeNumberCompositionDefinition } from '../../../trainers/visual/numberCompositionDefinition';
import { makeTableFillDefinition } from '../../../trainers/visual/tableFillDefinition';
import { makeSumTableDefinition } from '../../../trainers/visual/sumTableDefinition';
import { MENTAL_MATH_CONFIGS } from '../../../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../../../data/arithmeticEquationConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../../../data/numberCompositionConfig';
import { TABLE_FILL_CONFIGS } from '../../../data/tableFillConfig';
import { SUM_TABLE_CONFIGS } from '../../../data/sumTableConfig';

// Subtraction deps
import ColumnSubtractionSession from '../../../trainers/column/subtraction/ColumnSubtractionSession';

// Multiplication deps
import ColumnMultiplicationSession from '../../../trainers/column/multiplication/ColumnMultiplicationSession';
import { useMultiplicationTableDefinitionV2 } from '../../../trainers/drill/multiplicationTableDefinition';

// Division deps
import ColumnDivisionSession from '../../../trainers/column/division/ColumnDivisionSession';

export function ClassOperationTrainerPage(props: { grade: Grade; op: Operation; basePath: string; exerciseId: string }) {
  const exerciseId = String(props.exerciseId || '').trim();
  const backHref = props.basePath;

  if (props.op === 'addition') {
    if (exerciseId === 'column-addition') {
      return <TrainerFlow definition={makeColumnDefinition({ trainerId: 'column-addition', backHref, Game: ColumnAdditionSession })} />;
    }
    if (exerciseId.startsWith('column-add-')) {
      const variant =
        exerciseId === 'column-add-2d-1d-no-carry'
          ? ('2d-1d-no-carry' as const)
          : exerciseId === 'column-add-2d-1d-carry'
            ? ('2d-1d-carry' as const)
            : exerciseId === 'column-add-2d-2d-no-carry'
              ? ('2d-2d-no-carry' as const)
              : exerciseId === 'column-add-2d-2d-carry'
                ? ('2d-2d-carry' as const)
                : exerciseId === 'column-add-3d-2d'
                  ? ('3d-2d' as const)
                  : exerciseId === 'column-add-3d-3d'
                    ? ('3d-3d' as const)
                    : null;
      if (variant) {
        const VariantGame = (p: any) => <ColumnAdditionSession {...p} variant={variant} />;
        return <TrainerFlow definition={makeColumnDefinition({ trainerId: exerciseId, backHref, Game: VariantGame })} />;
      }
    }
    if (Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId)) {
      return <TrainerFlow definition={makeNumberCompositionDefinition({ trainerId: exerciseId, backHref })} />;
    }
    if (Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId)) {
      return <TrainerFlow definition={makeTableFillDefinition({ trainerId: exerciseId, backHref })} />;
    }
    if (Object.prototype.hasOwnProperty.call(SUM_TABLE_CONFIGS, exerciseId)) {
      return <TrainerFlow definition={makeSumTableDefinition({ trainerId: exerciseId, backHref })} />;
    }
    if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) {
      return <TrainerFlow definition={makeMentalMathDefinition({ trainerId: exerciseId, backHref })} />;
    }
    if (Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId)) {
      return <TrainerFlow definition={makeArithmeticEquationDefinition({ trainerId: exerciseId, backHref })} />;
    }
  }

  if (props.op === 'subtraction') {
    if (exerciseId === 'column-subtraction') {
      return <TrainerFlow definition={makeColumnDefinition({ trainerId: 'column-subtraction', backHref, Game: ColumnSubtractionSession })} />;
    }
    if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) {
      return <TrainerFlow definition={makeMentalMathDefinition({ trainerId: exerciseId, backHref })} />;
    }
    if (Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId)) {
      return <TrainerFlow definition={makeArithmeticEquationDefinition({ trainerId: exerciseId, backHref })} />;
    }
  }

  if (props.op === 'multiplication') {
    if (exerciseId === 'column-multiplication') {
      return <TrainerFlow definition={makeColumnDefinition({ trainerId: 'column-multiplication', backHref, Game: ColumnMultiplicationSession })} />;
    }
    if (/^mul-table-(\d+)$/.test(exerciseId)) {
      const def = useMultiplicationTableDefinitionV2({ backHref, exerciseId });
      return <TrainerFlow definition={def} />;
    }
  }

  if (props.op === 'division') {
    if (exerciseId === 'column-division') {
      return <TrainerFlow definition={makeColumnDefinition({ trainerId: 'column-division', backHref, Game: ColumnDivisionSession })} />;
    }
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card-elevated p-6">
          <h2 className="text-xl font-bold text-foreground">Не найдено</h2>
          <p className="text-muted-foreground mt-2">Тренажёра по этому адресу нет.</p>
          <div className="mt-4">
            <Link className="btn-primary inline-flex items-center gap-2" href={backHref}>
              <Home className="w-5 h-5" /> Назад
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

