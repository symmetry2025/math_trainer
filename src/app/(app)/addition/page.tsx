'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { GradeSection } from '../../../components/GradeSection';
import { ListStatsBar } from '../../../components/ListStatsBar';
import { TopicSection } from '../../../components/TopicSection';
import { additionData } from '../../../data/exerciseData';
import { MENTAL_MATH_CONFIGS } from '../../../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../../../data/arithmeticEquationConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../../../data/numberCompositionConfig';
import { TABLE_FILL_CONFIGS } from '../../../data/tableFillConfig';
import { restoreListReturn, saveListReturn } from '../../../lib/listScrollRestore';

export default function AdditionPage() {
  const router = useRouter();
  useEffect(() => {
    restoreListReturn('/addition', { behavior: 'smooth' });
  }, []);

  const handleExerciseClick = (exerciseId: string) => {
    saveListReturn('/addition', exerciseId);
    if (exerciseId === 'column-addition' || exerciseId.startsWith('column-add-')) {
      router.push(`/addition/${encodeURIComponent(exerciseId)}`);
      return;
    }
    // Mental arithmetic ids are config ids (add-10/add-20/sub-10/...)
    if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId)) {
      router.push(`/addition/${encodeURIComponent(exerciseId)}`);
      return;
    }
    // Arithmetic equations (? + b = sum)
    if (Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId)) {
      router.push(`/addition/${encodeURIComponent(exerciseId)}`);
      return;
    }
    // Visual arithmetic: number composition
    if (Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId)) {
      router.push(`/addition/${encodeURIComponent(exerciseId)}`);
      return;
    }
    // Visual arithmetic: table fill
    if (Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId)) {
      router.push(`/addition/${encodeURIComponent(exerciseId)}`);
      return;
    }
    console.log('Start exercise (not wired yet):', exerciseId);
  };

  const exerciseIds = additionData.flatMap((g) => g.sections.flatMap((s) => s.exercises.map((e) => e.id)));

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Сложение</h1>
            <p className="text-muted-foreground">Тренируй навыки сложения чисел</p>
          </div>
        </div>

        <ListStatsBar exerciseIds={exerciseIds} />

        <div className="space-y-10">
          {additionData.map((gradeData) => (
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

