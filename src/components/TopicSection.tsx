'use client';

import type { Exercise } from '../data/exerciseData';

import { ExerciseCardStageStyle as ExerciseCard } from './ExerciseCardStageStyle';
import { useCrystals } from '../lib/useCrystals';

export function TopicSection(props: {
  title: string;
  exercises: Exercise[];
  onExerciseClick?: (exerciseId: string) => void;
}) {
  const { getExerciseCrystals, getExerciseCrystalsCap, getExerciseProgress } = useCrystals();

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

