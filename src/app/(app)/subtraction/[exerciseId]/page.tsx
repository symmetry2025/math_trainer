'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

import ColumnSubtractionSession from '../../../../trainers/column/subtraction/ColumnSubtractionSession';
import { TrainerFlow } from '../../../../trainerFlow/TrainerFlow';
import { makeMentalMathDefinition } from '../../../../trainers/mental-math/mentalMathDefinition';
import { makeArithmeticEquationDefinition } from '../../../../trainers/arithmetic-equation/arithmeticEquationDefinition';
import { makeColumnDefinition } from '../../../../trainers/column/columnDefinition';
import { MENTAL_MATH_CONFIGS } from '../../../../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../../../../data/arithmeticEquationConfig';

export default function SubtractionTrainerPage(props: { params: { exerciseId: string } }) {
  const exerciseId = String(props.params.exerciseId || '').trim();

  if (exerciseId === 'column-subtraction') {
    return <TrainerFlow definition={makeColumnDefinition({ trainerId: 'column-subtraction', backHref: '/subtraction', Game: ColumnSubtractionSession })} />;
  }
  if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) {
    return <TrainerFlow definition={makeMentalMathDefinition({ trainerId: exerciseId, backHref: '/subtraction' })} />;
  }
  if (Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId)) {
    return <TrainerFlow definition={makeArithmeticEquationDefinition({ trainerId: exerciseId, backHref: '/subtraction' })} />;
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card-elevated p-6">
          <h2 className="text-xl font-bold text-foreground">Не найдено</h2>
          <p className="text-muted-foreground mt-2">Тренажёра по этому адресу нет.</p>
          <div className="mt-4">
            <Link className="btn-primary inline-flex items-center gap-2" href="/subtraction">
              <Home className="w-5 h-5" /> Назад
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

