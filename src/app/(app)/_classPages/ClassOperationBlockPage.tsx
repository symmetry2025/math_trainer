'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { TopicSection } from '../../../components/TopicSection';
import { ListStatsBar } from '../../../components/ListStatsBar';
import { additionData, divisionData, multiplicationData, subtractionData } from '../../../data/exerciseData';
import { emitProgressUpdated } from '../../../lib/stars';
import { exerciseIdToTrainerDbId, hydrateProgressBatchFromDb, wasHydratedRecently } from '../../../lib/progressHydration';
import type { Grade, Operation } from './types';
import { exerciseHrefForOp } from './exerciseNavigation';

export function ClassOperationBlockPage(props: { grade: Grade; op: Operation; basePath: string; blockId: string }) {
  const router = useRouter();

  const gradeData = useMemo(() => {
    const list =
      props.op === 'addition'
        ? additionData
        : props.op === 'subtraction'
          ? subtractionData
          : props.op === 'multiplication'
            ? multiplicationData
            : divisionData;
    return list.find((g) => g.grade === props.grade) ?? null;
  }, [props.op, props.grade]);

  const section = useMemo(() => {
    const id = String(props.blockId || '').trim();
    return gradeData?.sections.find((s) => s.id === id) ?? null;
  }, [gradeData, props.blockId]);

  const exerciseIds = useMemo(() => section?.exercises.map((e) => e.id) ?? [], [section]);

  useEffect(() => {
    const trainerDbIds = Array.from(new Set((exerciseIds || []).map((id) => exerciseIdToTrainerDbId(id)).filter(Boolean) as string[]));
    const toHydrate = trainerDbIds.filter((id) => !wasHydratedRecently(id, 60_000));
    if (!toHydrate.length) return;
    let cancelled = false;
    (async () => {
      await hydrateProgressBatchFromDb(toHydrate);
      if (!cancelled) emitProgressUpdated();
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseIds]);

  const handleExerciseClick = (exerciseId: string) => {
    const href = exerciseHrefForOp({ op: props.op, basePath: props.basePath, exerciseId });
    if (href) {
      router.push(href);
      return;
    }
    console.log('Start exercise (not wired yet):', exerciseId);
  };

  if (!gradeData || !section) {
    return (
      <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <button type="button" onClick={() => router.push(props.basePath)} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
          <div className="card-elevated p-6">
            <h1 className="text-xl md:text-2xl font-extrabold">Блок не найден</h1>
            <p className="text-muted-foreground mt-2">Похоже, этот блок ещё не настроен.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push(props.basePath)} className="btn-plain inline-flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Назад
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground truncate">{section.title}</h1>
            <p className="text-muted-foreground">Выбери тренажёр</p>
          </div>
        </div>

        <ListStatsBar exerciseIds={exerciseIds} />

        <TopicSection title="Тренажёры" exercises={section.exercises} onExerciseClick={handleExerciseClick} />
      </div>
    </div>
  );
}

