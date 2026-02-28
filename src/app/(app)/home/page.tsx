'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Rocket, Sparkles } from 'lucide-react';

import { cn } from '../../../lib/utils';

type Grade = 2 | 3 | 4;
type Op = 'addition' | 'subtraction' | 'multiplication' | 'division';

const GALAXIES: Array<{
  op: Op;
  title: string;
  subtitle: string;
  colorClass: string;
}> = [
  {
    op: 'addition',
    title: 'Галактика сложения',
    subtitle: 'Зелёная',
    colorClass: 'from-emerald-500/30 to-emerald-500/10 border-emerald-400/30 hover:border-emerald-300/60',
  },
  {
    op: 'subtraction',
    title: 'Галактика вычитания',
    subtitle: 'Голубая',
    colorClass: 'from-sky-500/30 to-sky-500/10 border-sky-400/30 hover:border-sky-300/60',
  },
  {
    op: 'multiplication',
    title: 'Галактика умножения',
    subtitle: 'Оранжевая',
    colorClass: 'from-orange-500/30 to-orange-500/10 border-orange-400/30 hover:border-orange-300/60',
  },
  {
    op: 'division',
    title: 'Галактика деления',
    subtitle: 'Фиолетовая',
    colorClass: 'from-violet-500/30 to-violet-500/10 border-violet-400/30 hover:border-violet-300/60',
  },
];

function gradeLabel(g: Grade) {
  return `${g} класс`;
}

export default function HomePage() {
  const router = useRouter();
  const [grade, setGrade] = useState<Grade | null>(2);

  const shipCards = useMemo(
    () =>
      ([2, 3, 4] as const).map((g) => ({
        grade: g,
        title: `Корабль ${g}‑го класса`,
        subtitle: 'Выбор маршрута обучения',
      })),
    [],
  );

  return (
    <div className="min-h-screen py-8 px-4 md:py-12 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 border border-border/60 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-foreground/80" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">Командный центр</h1>
              <p className="text-muted-foreground mt-1">Выбери корабль и галактику — и полетели тренироваться.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground pl-1">1) Выбор корабля</div>
          <div className="grid gap-3 md:gap-4 md:grid-cols-3">
            {shipCards.map((c) => {
              const active = grade === c.grade;
              return (
                <button
                  key={c.grade}
                  type="button"
                  onClick={() => setGrade(c.grade)}
                  className={cn(
                    'text-left rounded-3xl p-5 md:p-6 border transition-colors',
                    'bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-md',
                    active ? 'border-primary/50 ring-2 ring-primary/25' : 'border-border/50 hover:border-border/80',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center border', active ? 'bg-primary/15 border-primary/30' : 'bg-muted/30 border-border/50')}>
                      <Rocket className="w-6 h-6 text-foreground/80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base md:text-lg font-extrabold truncate">{gradeLabel(c.grade)}</div>
                      <div className="text-sm text-muted-foreground mt-1">{c.subtitle}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground pl-1">2) Выбор галактики</div>
          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            {GALAXIES.map((g) => (
              <button
                key={g.op}
                type="button"
                disabled={!grade}
                onClick={() => {
                  if (!grade) return;
                  router.push(`/class-${grade}/${g.op}`);
                }}
                className={cn(
                  'text-left rounded-3xl p-5 md:p-6 border transition-colors group',
                  'bg-gradient-to-br',
                  g.colorClass,
                  !grade && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-black/15 border border-white/10 flex items-center justify-center">
                    <span className="text-xl">🌌</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base md:text-lg font-extrabold truncate">{g.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{g.subtitle}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

