'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

import ColumnAdditionSession from '../../../../trainers/column/addition/ColumnAdditionSession';
import { TrainerFlow } from '../../../../trainerFlow/TrainerFlow';
import { makeMentalMathDefinition } from '../../../../trainers/mental-math/mentalMathDefinition';
import { makeArithmeticEquationDefinition } from '../../../../trainers/arithmetic-equation/arithmeticEquationDefinition';
import { makeColumnDefinition } from '../../../../trainers/column/columnDefinition';
import { makeNumberCompositionDefinition } from '../../../../trainers/visual/numberCompositionDefinition';
import { makeTableFillDefinition } from '../../../../trainers/visual/tableFillDefinition';
import { MENTAL_MATH_CONFIGS } from '../../../../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../../../../data/arithmeticEquationConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../../../../data/numberCompositionConfig';
import { TABLE_FILL_CONFIGS } from '../../../../data/tableFillConfig';

export default function AdditionTrainerPage(props: { params: { exerciseId: string } }) {
  const exerciseId = String(props.params.exerciseId || '').trim();

  // We intentionally keep addition and subtraction in separate families (/addition vs /subtraction).
  // If a subtraction id hits this route (e.g. old link / back button), show "not found".
  if (exerciseId === 'column-subtraction' || exerciseId.startsWith('sub-')) {
    // fall through to "not found" block
  } else {
  if (exerciseId === 'column-addition') {
    return <TrainerFlow definition={makeColumnDefinition({ trainerId: 'column-addition', backHref: '/addition', Game: ColumnAdditionSession })} />;
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
              : null;

    if (!variant) {
      // unknown variant id
    } else {
      const VariantGame = (p: any) => <ColumnAdditionSession {...p} variant={variant} />;
      return <TrainerFlow definition={makeColumnDefinition({ trainerId: exerciseId, backHref: '/addition', Game: VariantGame })} />;
    }
  }
  if (Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId)) {
    return <TrainerFlow definition={makeNumberCompositionDefinition({ trainerId: exerciseId, backHref: '/addition' })} />;
  }
  if (Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId)) {
    return <TrainerFlow definition={makeTableFillDefinition({ trainerId: exerciseId, backHref: '/addition' })} />;
  }
  if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) {
    return <TrainerFlow definition={makeMentalMathDefinition({ trainerId: exerciseId, backHref: '/addition' })} />;
  }
  if (Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId)) {
    return <TrainerFlow definition={makeArithmeticEquationDefinition({ trainerId: exerciseId, backHref: '/addition' })} />;
  }
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card-elevated p-6">
          <h2 className="text-xl font-bold text-foreground">Не найдено</h2>
          <p className="text-muted-foreground mt-2">Тренажёра по этому адресу нет.</p>
          <div className="mt-4">
            <Link className="btn-primary inline-flex items-center gap-2" href="/addition">
              <Home className="w-5 h-5" /> Назад
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

