'use client';

import { Clock, Flame, Star, Target, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChallengeTodayResponseDtoSchema, type ChallengeTodayResponseDto } from '@smmtry/shared';

export default function ChallengeScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChallengeTodayResponseDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/challenge/today', { method: 'GET', credentials: 'include', headers: { accept: 'application/json' } });
        const json: any = await res.json().catch(() => null);
        const parsed = ChallengeTodayResponseDtoSchema.safeParse(json);
        if (!parsed.success) throw new Error('invalid_response');
        if (cancelled) return;
        setData(parsed.data);
      } catch {
        if (cancelled) return;
        setError('Не удалось загрузить челлендж.');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayChallenge = data?.today ?? null;
  const streakDays = data?.streak.streakDays ?? 0;
  const nextMilestoneDays = data?.streak.nextMilestoneDays ?? 7;
  const milestoneRewardStars = data?.streak.milestoneRewardStars ?? nextMilestoneDays * 10;

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-orange-600 flex items-center justify-center shadow-accent">
            <Flame className="w-7 h-7 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ежедневный челлендж</h1>
            <p className="text-muted-foreground">Выполняй задания каждый день и получай награды!</p>
          </div>
        </div>

        <div className="card-elevated p-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full flex items-center justify-center -ml-2 first:ml-0 border-2 border-card ${
                      i < streakDays ? 'bg-gradient-to-br from-accent to-orange-600' : 'bg-muted'
                    }`}
                  >
                    <Flame className={`w-4 h-4 ${i < streakDays ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                ))}
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{streakDays} дней подряд</div>
                <div className="text-sm text-muted-foreground">До следующей награды: {Math.max(0, nextMilestoneDays - streakDays)} дней</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Награда за серию</div>
              <div className="text-lg font-bold text-accent">+{milestoneRewardStars} ⭐</div>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6 animate-fade-in">
          {loading ? <div className="text-muted-foreground">Загрузка…</div> : null}
          {error ? <div className="text-destructive">{error}</div> : null}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">{todayChallenge?.title ?? '—'}</h2>
              <p className="text-muted-foreground mt-1">{todayChallenge?.description ?? ''}</p>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-accent to-orange-600 text-white px-4 py-2 rounded-full">
              <Star className="w-5 h-5 fill-white text-white" />
              <span className="font-bold">+{todayChallenge?.rewardStars ?? 0}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Время</span>
              </div>
              <div className="text-lg font-bold text-foreground">{todayChallenge?.timeLimitLabel ?? '—'}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="w-4 h-4" />
                <span className="text-sm">Сложность</span>
              </div>
              <div className="text-lg font-bold text-foreground">{todayChallenge?.difficultyLabel ?? '—'}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Цель</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {todayChallenge?.total ?? 0} сессия
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Прогресс</span>
              <span className="text-sm font-bold text-foreground">
                {todayChallenge?.progress ?? 0} / {todayChallenge?.total ?? 1}
              </span>
            </div>
            <div className="progress-bar h-3">
              <div
                className="progress-bar-fill bg-gradient-to-r from-accent to-orange-600"
                style={{
                  width: `${todayChallenge ? Math.max(0, Math.min(100, (todayChallenge.progress / Math.max(1, todayChallenge.total)) * 100)) : 0}%`,
                }}
              />
            </div>
          </div>

          <button
            className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!todayChallenge?.startHref}
            onClick={() => {
              if (!todayChallenge?.startHref) return;
              window.location.assign(todayChallenge.startHref);
            }}
          >
            Начать челлендж
          </button>
        </div>
      </div>
    </div>
  );
}

