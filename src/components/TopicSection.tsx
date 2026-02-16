'use client';

import type { Exercise } from '../data/exerciseData';

import { ExerciseCardStageStyle as ExerciseCard } from './ExerciseCardStageStyle';
import { useCrystals } from '../lib/useCrystals';
import { hydrateProgressFromDb, wasHydratedRecently } from '../lib/progressHydration';
import { emitProgressUpdated } from '../lib/crystals';
import { useEffect } from 'react';
import { MENTAL_MATH_CONFIGS } from '../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../data/arithmeticEquationConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../data/numberCompositionConfig';
import { TABLE_FILL_CONFIGS } from '../data/tableFillConfig';

export function TopicSection(props: {
  title: string;
  exercises: Exercise[];
  onExerciseClick?: (exerciseId: string) => void;
}) {
  const { getExerciseCrystals, getExerciseCrystalsCap, getExerciseProgress } = useCrystals();

  useEffect(() => {
    // Hydrate progress for wired exercises once on list pages so trainer screens don't flicker and don't refetch immediately.
    const trainerDbIds = Array.from(
      new Set(
        props.exercises
          .map((e) => e.id)
          .map((id) => {
            if (id.startsWith('column-')) return id;
            // multiplication table per multiplier: `mul-table-<n>` -> arithmetic:mul-table-<n>
            if (/^mul-table-(\d+)$/.test(id)) return `arithmetic:${id}`;
            // mental arithmetic: arithmetic:<id>
            if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, id)) return `arithmetic:${id}`;
            // arithmetic equations: arithmetic:<id>
            if (Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, id)) return `arithmetic:${id}`;
            // visual arithmetic (number composition): arithmetic:<id>
            if (Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, id)) return `arithmetic:${id}`;
            // visual arithmetic (table fill): arithmetic:<id>
            if (Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, id)) return `arithmetic:${id}`;
            return null;
          })
          .filter(Boolean) as string[],
      ),
    );

    // limit network: only hydrate if not done recently
    const toHydrate = trainerDbIds.filter((id) => !wasHydratedRecently(id, 60_000)); // 1 minute TTL is enough for page transitions
    if (!toHydrate.length) return;
    let cancelled = false;
    (async () => {
      await Promise.allSettled(toHydrate.map((id) => hydrateProgressFromDb(id)));
      if (!cancelled) emitProgressUpdated();
    })();
    return () => {
      cancelled = true;
    };
    // intentionally depend only on exercises list identity (new sections trigger their own hydration)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.exercises]);

  return (
    <div className="space-y-3">
      <h3 className="text-base md:text-lg font-bold text-foreground pl-1">{props.title}</h3>
      <div className="grid gap-3">
        {props.exercises.map((exercise, idx) => {
          const status = getExerciseProgress(exercise.id);
          return (
            <ExerciseCard
              key={exercise.id}
              exerciseId={exercise.id}
              ordinal={idx + 1}
              title={exercise.title}
              description={exercise.description}
              unlocked={exercise.unlocked}
              crystalsEarned={getExerciseCrystals(exercise.id)}
              crystalsTotal={getExerciseCrystalsCap(exercise.id)}
              fallbackCrystalsTotal={exercise.total}
              preRaceDone={!!status?.preRaceDone}
              raceStars={(status?.raceStars ?? 0) as 0 | 1 | 2 | 3}
              onClick={props.onExerciseClick ? () => props.onExerciseClick?.(exercise.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

