'use client';

import { Medal, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AchievementItemDto } from '@smmtry/shared';
import { AchievementsResponseDtoSchema } from '@smmtry/shared';

import { cn } from '../../lib/utils';

function iconClassFor(iconKey: string) {
  // keep stable; UI can be expanded later
  if (iconKey === 'zap') return 'from-blue-400 to-cyan-500';
  if (iconKey === 'target') return 'from-green-400 to-emerald-500';
  if (iconKey === 'crown') return 'from-purple-400 to-pink-500';
  if (iconKey === 'flame') return 'from-accent to-orange-600';
  if (iconKey === 'medal') return 'from-yellow-400 to-amber-500';
  if (iconKey === 'star') return 'from-yellow-400 to-amber-500';
  if (iconKey === 'swords') return 'from-primary to-primary/80';
  return 'from-primary to-primary/80';
}

export default function AchievementsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<AchievementItemDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/achievements', { method: 'GET', credentials: 'include', headers: { accept: 'application/json' } });
        const json: any = await res.json().catch(() => null);
        const parsed = AchievementsResponseDtoSchema.safeParse(json);
        if (!parsed.success) throw new Error('invalid_response');
        if (cancelled) return;
        setAchievements(parsed.data.achievements);
      } catch {
        if (cancelled) return;
        setError('Не удалось загрузить достижения.');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unlockedCount = useMemo(() => achievements.filter((a) => !!a.unlockedAt).length, [achievements]);

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Достижения</h1>
            <p className="text-muted-foreground">Открывай достижения по мере тренировок</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 animate-fade-in">
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <Medal className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {unlockedCount}/{achievements.length}
                </div>
                <div className="text-sm text-muted-foreground">Открыто</div>
              </div>
            </div>
          </div>
        </div>

        {loading ? <div className="text-muted-foreground">Загрузка…</div> : null}
        {error ? <div className="text-destructive">{error}</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => {
            const unlocked = !!achievement.unlockedAt;
            const total = Math.max(1, Number(achievement.total ?? 1));
            const progress = Math.max(0, Number(achievement.progress ?? 0));
            const percentage = Math.max(0, Math.min(100, (progress / total) * 100));

            return (
              <div
                key={achievement.id}
                className={cn('card-elevated p-5 transition-all duration-300 animate-fade-in', !unlocked && 'opacity-70')}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg',
                      iconClassFor(achievement.iconKey),
                      unlocked ? 'shadow-primary/20' : 'shadow-none',
                    )}
                  >
                    <Trophy className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-foreground">{achievement.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Прогресс</span>
                        <span className="text-xs font-bold text-foreground">
                          {progress}/{total}
                        </span>
                      </div>
                      <div className="progress-bar h-2">
                        <div
                          className={cn(
                            'progress-bar-fill',
                            unlocked ? 'bg-gradient-to-r ' + iconClassFor(achievement.iconKey) : 'bg-muted-foreground'
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

