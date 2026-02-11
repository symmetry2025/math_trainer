'use client';

import { Divide } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { GradeSection } from '../../../components/GradeSection';
import { ListStatsBar } from '../../../components/ListStatsBar';
import { TopicSection } from '../../../components/TopicSection';
import { divisionData } from '../../../data/exerciseData';
import { restoreListReturn, saveListReturn } from '../../../lib/listScrollRestore';

export default function DivisionPage() {
  const router = useRouter();
  useEffect(() => {
    restoreListReturn('/division', { behavior: 'smooth' });
  }, []);

  const handleExerciseClick = (exerciseId: string) => {
    saveListReturn('/division', exerciseId);
    if (exerciseId === 'column-division') {
      router.push('/division/column-division');
      return;
    }
    console.log('Start exercise (not wired yet):', exerciseId);
  };

  const exerciseIds = divisionData.flatMap((g) => g.sections.flatMap((s) => s.exercises.map((e) => e.id)));

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-primary">
            <Divide className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Деление</h1>
            <p className="text-muted-foreground">Тренируй навыки деления и понимание таблицы деления</p>
          </div>
        </div>

        <ListStatsBar exerciseIds={exerciseIds} />

        <div className="space-y-10">
          {divisionData.map((gradeData) => (
            <GradeSection key={gradeData.grade} grade={gradeData.grade}>
              {gradeData.sections.map((section) => (
                <TopicSection key={section.id} title={section.title} exercises={section.exercises} onExerciseClick={handleExerciseClick} />
              ))}
            </GradeSection>
          ))}
        </div>
      </div>
    </div>
  );
}

