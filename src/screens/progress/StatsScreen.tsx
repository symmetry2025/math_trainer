'use client';

import { BarChart3, Calendar, Clock, Target, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StatsSummaryDtoSchema, type StatsSummaryDto } from '@smmtry/shared';

export default function StatsScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const childId = (sp?.get('childId') || '').trim();
  const [childLabel, setChildLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<StatsSummaryDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/parent/children', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { accept: 'application/json' } });
        const body: any = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setChildLabel(null);
          return;
        }
        const list: any[] = Array.isArray(body?.children) ? body.children : [];
        if (!list.length) {
          setChildLabel('Нет привязанных детей');
          return;
        }
        const selected = childId ? list.find((c) => String(c?.userId || '') === childId) : list[0];
        const id = String(selected?.userId || '').trim();
        const label = (String(selected?.displayName || '').trim() || String(selected?.email || '').trim() || id || '').trim();
        setChildLabel(label || null);
        if (!childId && id) router.replace(`/progress/stats?childId=${encodeURIComponent(id)}`);
      } catch {
        if (cancelled) return;
        setChildLabel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = childId ? `/api/stats/summary?childId=${encodeURIComponent(childId)}` : '/api/stats/summary';
        const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { accept: 'application/json' } });
        const json: any = await res.json().catch(() => null);
        const parsed = StatsSummaryDtoSchema.safeParse(json);
        if (!parsed.success) throw new Error('invalid_response');
        if (cancelled) return;
        setSummary(parsed.data);
      } catch {
        if (cancelled) return;
        setError('Не удалось загрузить статистику.');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  const totalProblems = summary?.totalProblems ?? 0;
  const accuracyPct = summary ? Math.round(summary.accuracyPct) : 0;
  const totalTimeSec = summary?.totalTimeSec ?? 0;
  const totalMinutes = Math.round(totalTimeSec / 60);
  const week = summary?.week ?? [];
  const maxWeekSessions = Math.max(1, ...week.map((d) => d.successSessions));

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-primary">
            <BarChart3 className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Статистика</h1>
            <p className="text-muted-foreground">{childLabel ? childLabel : 'Отслеживай свой прогресс и улучшай результаты'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold text-foreground">{totalProblems}</div>
                <div className="text-sm text-muted-foreground">Примеров решено</div>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">{accuracyPct}%</div>
                <div className="text-sm text-muted-foreground">Средняя точность</div>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-accent" />
              <div>
                <div className="text-2xl font-bold text-foreground">{totalMinutes}м</div>
                <div className="text-sm text-muted-foreground">Время всего</div>
              </div>
            </div>
          </div>
        </div>

        {loading ? <div className="text-muted-foreground">Загрузка…</div> : null}
        {error ? <div className="text-destructive">{error}</div> : null}

        <div className="card-elevated p-6 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Неделя
          </h2>
          <div className="flex items-end justify-between gap-2 h-40">
            {(week.length ? week : [
              { date: '—', label: 'Пн', successSessions: 0 },
              { date: '—', label: 'Вт', successSessions: 0 },
              { date: '—', label: 'Ср', successSessions: 0 },
              { date: '—', label: 'Чт', successSessions: 0 },
              { date: '—', label: 'Пт', successSessions: 0 },
              { date: '—', label: 'Сб', successSessions: 0 },
              { date: '—', label: 'Вс', successSessions: 0 },
            ]).map((day, idx) => {
              const pct = Math.max(0, Math.min(100, (day.successSessions / maxWeekSessions) * 100));
              return (
                <div key={`${day.date}-${idx}`} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-muted rounded-lg flex items-end overflow-hidden" style={{ height: '120px' }}>
                    <div className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-lg" style={{ height: `${pct}%` }} />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">{day.label}</div>
                  <div className="text-xs font-bold text-foreground tabular-nums">{day.successSessions}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

