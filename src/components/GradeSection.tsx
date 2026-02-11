import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

const gradeColors: Record<number, string> = {
  2: 'from-blue-500 to-cyan-500',
  3: 'from-primary to-primary/80',
  4: 'from-purple-500 to-pink-500',
  5: 'from-accent to-orange-400',
  6: 'from-rose-500 to-red-400',
};

export function GradeSection(props: { grade: number; children: ReactNode; className?: string }) {
  return (
    <section className={cn('animate-fade-in', props.className)}>
      <div className="flex items-center gap-4 mb-6">
        <div
          className={cn(
            'w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br',
            gradeColors[props.grade] || 'from-gray-500 to-gray-600',
          )}
        >
          <span className="text-xl md:text-2xl font-bold text-white">{props.grade}</span>
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">{props.grade} класс</h2>
          <p className="text-sm text-muted-foreground">{getGradeDescription(props.grade)}</p>
        </div>
      </div>

      <div className="space-y-6">{props.children}</div>
    </section>
  );
}

function getGradeDescription(grade: number): string {
  switch (grade) {
    case 2:
      return 'Основы счёта и простые операции';
    case 3:
      return 'Таблица умножения и деления';
    case 4:
      return 'Многозначные числа';
    case 5:
      return 'Дроби и проценты';
    case 6:
      return 'Отрицательные числа';
    default:
      return '';
  }
}

