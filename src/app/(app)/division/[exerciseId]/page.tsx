'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

import ColumnDivisionSession from '../../../../trainers/column/division/ColumnDivisionSession';
import { TrainerFlow } from '../../../../trainerFlow/TrainerFlow';
import { makeColumnDefinition } from '../../../../trainers/column/columnDefinition';

export default function DivisionTrainerPage(props: { params: { exerciseId: string } }) {
  const exerciseId = String(props.params.exerciseId || '').trim();

  if (exerciseId === 'column-division') {
    return <TrainerFlow definition={makeColumnDefinition({ trainerId: 'column-division', backHref: '/division', Game: ColumnDivisionSession })} />;
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card-elevated p-6">
          <h2 className="text-xl font-bold text-foreground">Не найдено</h2>
          <p className="text-muted-foreground mt-2">Тренажёра по этому адресу нет.</p>
          <div className="mt-4">
            <Link className="btn-primary inline-flex items-center gap-2" href="/division">
              <Home className="w-5 h-5" /> Назад
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

