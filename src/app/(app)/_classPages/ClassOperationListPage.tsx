'use client';

import { Calculator, Divide, Minus, Plus, X as Times } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { ListStatsBar } from '../../../components/ListStatsBar';
import { TopicSection } from '../../../components/TopicSection';
import { additionData, divisionData, multiplicationData, subtractionData } from '../../../data/exerciseData';
import { ARITHMETIC_EQUATION_CONFIGS } from '../../../data/arithmeticEquationConfig';
import { MENTAL_MATH_CONFIGS } from '../../../data/mentalMathConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../../../data/numberCompositionConfig';
import { SUM_TABLE_CONFIGS } from '../../../data/sumTableConfig';
import { TABLE_FILL_CONFIGS } from '../../../data/tableFillConfig';
import { SUB_TABLE_CONFIGS } from '../../../data/subTableConfig';
import { restoreListReturn, saveListReturn } from '../../../lib/listScrollRestore';
import { emitProgressUpdated } from '../../../lib/crystals';
import { exerciseIdToTrainerDbId, hydrateProgressBatchFromDb, wasHydratedRecently } from '../../../lib/progressHydration';
import type { Grade, Operation } from './types';

const opUi: Record<
  Operation,
  {
    title: string;
    subtitle: string;
    icon: any;
    iconClassName: string;
  }
> = {
  addition: {
    title: 'Сложение',
    subtitle: 'Тренируй навыки сложения чисел',
    icon: Plus,
    iconClassName: 'bg-gradient-to-br from-blue-500 to-cyan-500',
  },
  subtraction: {
    title: 'Вычитание',
    subtitle: 'Тренируй навыки вычитания чисел',
    icon: Minus,
    iconClassName: 'bg-gradient-to-br from-orange-500 to-rose-500',
  },
  multiplication: {
    title: 'Умножение',
    subtitle: 'Изучай и тренируй таблицу умножения',
    icon: Times,
    iconClassName: 'bg-gradient-to-br from-primary to-primary/80',
  },
  division: {
    title: 'Деление',
    subtitle: 'Тренируй навыки деления и понимание таблицы деления',
    icon: Divide,
    iconClassName: 'bg-gradient-to-br from-primary to-primary/80',
  },
};

export function ClassOperationListPage(props: { grade: Grade; op: Operation; basePath: string }) {
  const router = useRouter();

  useEffect(() => {
    restoreListReturn(props.basePath, { behavior: 'smooth' });
  }, [props.basePath]);

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

  const exerciseIds = useMemo(() => gradeData?.sections.flatMap((s) => s.exercises.map((e) => e.id)) ?? [], [gradeData]);

  useEffect(() => {
    // Hydrate progress for wired exercises once for the whole list page to avoid N+1 requests.
    const trainerDbIds = Array.from(
      new Set(
        (exerciseIds || [])
          .map((id) => exerciseIdToTrainerDbId(id))
          .filter(Boolean) as string[],
      ),
    );
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
    saveListReturn(props.basePath, exerciseId);

    if (props.op === 'addition') {
      if (exerciseId === 'column-addition' || exerciseId.startsWith('column-add-')) {
        router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
        return;
      }
      if (
        Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId) ||
        Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId) ||
        Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId) ||
        Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId) ||
        Object.prototype.hasOwnProperty.call(SUM_TABLE_CONFIGS, exerciseId)
      ) {
        router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
        return;
      }
      console.log('Start exercise (not wired yet):', exerciseId);
      return;
    }

    if (props.op === 'subtraction') {
      if (exerciseId === 'column-subtraction') {
        router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
        return;
      }
      if (exerciseId.startsWith('column-sub-')) {
        router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
        return;
      }
      if (
        Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId) ||
        Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId) ||
        Object.prototype.hasOwnProperty.call(SUB_TABLE_CONFIGS, exerciseId)
      ) {
        router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
        return;
      }
      console.log('Start exercise (not wired yet):', exerciseId);
      return;
    }

    if (props.op === 'multiplication') {
      if (exerciseId === 'column-multiplication') {
        router.push(`${props.basePath}/column-multiplication`);
        return;
      }
      if (exerciseId.startsWith('column-mul-')) {
        router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
        return;
      }
      if (/^mul-table-(\d+)$/.test(String(exerciseId || '')) || exerciseId === 'mul-table-full' || exerciseId === 'mul-table-2-5') {
        router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
        return;
      }
      if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) {
        router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
        return;
      }
      console.log('Start exercise (not wired yet):', exerciseId);
      return;
    }

    // division
    if (exerciseId === 'column-division' || exerciseId.startsWith('column-division-')) {
      router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) {
      router.push(`${props.basePath}/${encodeURIComponent(exerciseId)}`);
      return;
    }
    console.log('Start exercise (not wired yet):', exerciseId);
  };

  const ui = opUi[props.op];
  const Icon = ui.icon;

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4 animate-fade-in">
          <div className={`w-14 h-14 rounded-2xl ${ui.iconClassName} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{ui.title}</h1>
            <p className="text-muted-foreground">{ui.subtitle}</p>
          </div>
        </div>

        <ListStatsBar exerciseIds={exerciseIds} />

        {gradeData ? (
          <div className="space-y-10">
            {gradeData.sections.map((section) => (
              <TopicSection key={section.id} title={section.title} exercises={section.exercises} onExerciseClick={handleExerciseClick} />
            ))}
          </div>
        ) : (
          <div className="card-elevated p-6">
            <h2 className="text-xl font-bold text-foreground">Пока пусто</h2>
            <p className="text-muted-foreground mt-2">Для {props.grade} класса в разделе “{ui.title}” пока нет тренажёров.</p>
          </div>
        )}
      </div>
    </div>
  );
}

