'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

import ColumnMultiplicationSession from '../../../../trainers/column/multiplication/ColumnMultiplicationSession';
import { TrainerFlow } from '../../../../trainerFlow/TrainerFlow';
import { makeColumnDefinition } from '../../../../trainers/column/columnDefinition';
import { useMultiplicationTableDefinitionV2 } from '../../../../trainers/drill/multiplicationTableDefinition';

export default function MultiplicationTrainerPage(props: { params: { exerciseId: string } }) {
  const exerciseId = String(props.params.exerciseId || '').trim();

  if (exerciseId === 'column-multiplication') {
    return (
      <TrainerFlow
        definition={makeColumnDefinition({ trainerId: 'column-multiplication', backHref: '/multiplication', Game: ColumnMultiplicationSession })}
      />
    );
  }

  if (/^mul-table-(\d+)$/.test(exerciseId) || exerciseId === 'mul-table-full' || exerciseId === 'mul-table-2-5') {
    const def = useMultiplicationTableDefinitionV2({ backHref: '/multiplication', exerciseId });
    return <TrainerFlow definition={def} />;
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card-elevated p-6">
          <h2 className="text-xl font-bold text-foreground">Не найдено</h2>
          <p className="text-muted-foreground mt-2">Тренажёра по этому адресу нет.</p>
          <div className="mt-4">
            <Link className="btn-primary inline-flex items-center gap-2" href="/multiplication">
              <Home className="w-5 h-5" /> Назад
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

