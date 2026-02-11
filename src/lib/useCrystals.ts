'use client';

import { useCallback, useEffect, useState } from 'react';

import { getCrystalsCapForExercise, getCrystalsForExercise, getExerciseProgressStatus, getTotalCrystals, PROGRESS_UPDATED_EVENT, type ExerciseProgressStatus } from './crystals';

export function useCrystals() {
  const [tick, setTick] = useState(0);
  const [totalCrystals, setTotalCrystals] = useState(0);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setTotalCrystals(getTotalCrystals());
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

  const getExerciseCrystals = useCallback(
    (exerciseId: string) => {
      // tick dependency forces rerender consumers after progress changes, even if total stays same.
      void tick;
      // Avoid hydration mismatch: server renders 0; read localStorage only after mount.
      if (!mounted) return 0;
      return getCrystalsForExercise(exerciseId);
    },
    [tick, mounted],
  );

  const getExerciseCrystalsCap = useCallback(
    (exerciseId: string) => {
      void tick;
      return getCrystalsCapForExercise(exerciseId);
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

  return { totalCrystals, getExerciseCrystals, getExerciseCrystalsCap, getExerciseProgress };
}

