'use client';

import { Gem, Star } from 'lucide-react';
import { useMemo } from 'react';

import { useCrystals } from '../lib/useCrystals';
import { cn } from '../lib/utils';

function clampStars(v: unknown): 0 | 1 | 2 | 3 {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

export function ListStatsBar(props: { exerciseIds: string[]; className?: string }) {
  const { getExerciseCrystals, getExerciseCrystalsCap, getExerciseProgress } = useCrystals();

  const stats = useMemo(() => {
    const ids = props.exerciseIds || [];
    const wired = ids.filter((id) => getExerciseCrystalsCap(id) > 0);

    const crystalsEarned = wired.reduce((sum, id) => sum + getExerciseCrystals(id), 0);
    const crystalsTotal = wired.reduce((sum, id) => sum + getExerciseCrystalsCap(id), 0);

    const starsEarned = wired.reduce((sum, id) => sum + clampStars(getExerciseProgress(id)?.raceStars), 0);
    const starsTotal = wired.length * 3;

    return { wiredCount: wired.length, crystalsEarned, crystalsTotal, starsEarned, starsTotal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.exerciseIds, getExerciseCrystals, getExerciseCrystalsCap, getExerciseProgress]);

  const crystalPct = stats.crystalsTotal > 0 ? Math.round((stats.crystalsEarned / stats.crystalsTotal) * 100) : 0;
  const starsPct = stats.starsTotal > 0 ? Math.round((stats.starsEarned / stats.starsTotal) * 100) : 0;

  return (
    <div
      className={cn(
        'w-full rounded-2xl border-2 bg-white dark:bg-card border-border/40 shadow-sm p-4 md:p-6 animate-fade-in',
        props.className,
      )}
    >
      <div className="space-y-4">
        {/* Crystals */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gem className="w-4 h-4 text-primary" />
              <span>Кристаллы</span>
            </div>
            <div className="text-sm font-semibold text-foreground tabular-nums">
              {stats.crystalsEarned} / {stats.crystalsTotal}
            </div>
          </div>
          <div className="progress-bar h-3">
            <div className="progress-bar-fill" style={{ width: `${crystalPct}%` }} />
          </div>
        </div>

        {/* Stars */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span>Звёзды</span>
            </div>
            <div className="text-sm font-semibold text-foreground tabular-nums">
              {stats.starsEarned} / {stats.starsTotal}
            </div>
          </div>
          <div className="progress-bar h-3">
            <div className="progress-bar-fill" style={{ width: `${starsPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

