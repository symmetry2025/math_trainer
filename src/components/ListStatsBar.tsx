'use client';

import { Star } from 'lucide-react';
import { useMemo } from 'react';

import { useStars } from '../lib/useStars';
import { cn } from '../lib/utils';

export function ListStatsBar(props: { exerciseIds: string[]; className?: string }) {
  const { getExerciseStars, getExerciseStarsCap } = useStars();

  const stats = useMemo(() => {
    const ids = props.exerciseIds || [];
    const wired = ids.filter((id) => getExerciseStarsCap(id) > 0);

    const starsEarned = wired.reduce((sum, id) => sum + getExerciseStars(id), 0);
    const starsTotal = wired.reduce((sum, id) => sum + getExerciseStarsCap(id), 0);

    return { wiredCount: wired.length, starsEarned, starsTotal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.exerciseIds, getExerciseStars, getExerciseStarsCap]);

  const starsPct = stats.starsTotal > 0 ? Math.round((stats.starsEarned / stats.starsTotal) * 100) : 0;

  return (
    <div
      className={cn(
        'w-full rounded-2xl border-2 bg-white dark:bg-card border-border/40 shadow-sm p-4 md:p-6 animate-fade-in',
        props.className,
      )}
    >
      <div className="space-y-4">
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

