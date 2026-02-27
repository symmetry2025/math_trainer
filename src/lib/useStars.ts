'use client';

import { useCallback, useEffect, useState } from 'react';

import { getExerciseProgressStatus, getStarsCapForExercise, getStarsForExercise, getTotalStars, PROGRESS_UPDATED_EVENT, type ExerciseProgressStatus } from './stars';

export function useStars() {
  const [tick, setTick] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setTotalStars(getTotalStars());
    setTick((v) => v + 1);
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();

    const onCustom = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith('smmtry.trainer.progress:')) refresh();
    };

    window.addEventListener(PROGRESS_UPDATED_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PROGRESS_UPDATED_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  const getExerciseStars = useCallback(
    (exerciseId: string) => {
      void tick;
      if (!mounted) return 0;
      return getStarsForExercise(exerciseId);
    },
    [tick, mounted],
  );

  const getExerciseStarsCap = useCallback(
    (exerciseId: string) => {
      void tick;
      return getStarsCapForExercise(exerciseId);
    },
    [tick],
  );

  const getExerciseProgress = useCallback(
    (exerciseId: string): ExerciseProgressStatus | null => {
      void tick;
      if (!mounted) return null;
      return getExerciseProgressStatus(exerciseId);
    },
    [tick, mounted],
  );

  return { totalStars, getExerciseStars, getExerciseStarsCap, getExerciseProgress };
}

