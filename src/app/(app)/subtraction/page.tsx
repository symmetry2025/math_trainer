'use client';

import { Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { GradeSection } from '../../../components/GradeSection';
import { ListStatsBar } from '../../../components/ListStatsBar';
import { TopicSection } from '../../../components/TopicSection';
import { subtractionData } from '../../../data/exerciseData';
import { MENTAL_MATH_CONFIGS } from '../../../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../../../data/arithmeticEquationConfig';
import { restoreListReturn, saveListReturn } from '../../../lib/listScrollRestore';

export default function SubtractionPage() {
  const router = useRouter();
  useEffect(() => {
    restoreListReturn('/subtraction', { behavior: 'smooth' });
  }, []);

  const handleExerciseClick = (exerciseId: string) => {
    saveListReturn('/subtraction', exerciseId);
    if (exerciseId === 'column-subtraction') {
      router.push(`/subtraction/${encodeURIComponent(exerciseId)}`);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) {
      router.push(`/subtraction/${encodeURIComponent(exerciseId)}`);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId)) {
      router.push(`/subtraction/${encodeURIComponent(exerciseId)}`);
      return;
    }
    console.log('Start exercise (not wired yet):', exerciseId);
  };

  const exerciseIds = subtractionData.flatMap((g) => g.sections.flatMap((s) => s.exercises.map((e) => e.id)));

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg">
            <Minus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Вычитание</h1>
            <p className="text-muted-foreground">Тренируй навыки вычитания чисел</p>
          </div>
        </div>

        <ListStatsBar exerciseIds={exerciseIds} />

        <div className="space-y-10">
          {subtractionData.map((gradeData) => (
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

