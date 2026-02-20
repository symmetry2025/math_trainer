'use client';

import { useMemo, useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import type { NewlyUnlockedAchievementDto } from '@smmtry/shared';

import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { TrainerResultCard } from './TrainerResultCard';
import type { SessionResult } from '../types';

function iconFor(key: string) {
  // Minimal mapping for now; can be expanded later.
  // We keep a deterministic fallback to avoid runtime crashes.
  switch (key) {
    case 'star':
    case 'trophy':
    case 'crown':
    case 'medal':
      return Trophy;
    default:
      return Trophy;
  }
}

export function PostSessionAchievements(props: {
  achievements: NewlyUnlockedAchievementDto[];
  unlockedPresetTitle?: string | null;
  title: string;
  presetId: string;
  presetTitle: string;
  result: SessionResult;
  canGoNext: boolean;
  nextPresetTitle?: string | null;
  onNextLevel: () => void;
  onRetry: () => void;
  onBackToSelect: () => void;
}) {
  type Item = NewlyUnlockedAchievementDto & { __silent?: boolean };
  const items: Item[] = useMemo(() => {
    const base = (props.achievements ?? []) as Item[];
    const unlocked = String(props.unlockedPresetTitle || '').trim();
    if (!unlocked) return base;
    return [
      ...base,
      {
        id: 'ui:unlocked-preset',
        title: 'Открыт новый этап',
        description: `Теперь доступен: ${unlocked}`,
        iconKey: 'sparkles',
        unlockedAt: new Date().toISOString(),
        __silent: true,
      },
    ];
  }, [props.achievements, props.unlockedPresetTitle]);

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const current = items[idx] ?? null;
  const isLast = idx >= items.length - 1;
  const [showResult, setShowResult] = useState(items.length === 0);

  const Icon = useMemo(() => (current ? iconFor(current.iconKey) : Trophy), [current]);

  if (!current && !showResult) return null;

  const handleNext = () => {
    if (phase === 'out') return;
    if (isLast) {
      setPhase('out');
      window.setTimeout(() => {
        setShowResult(true);
        setPhase('in');
      }, 280);
      return;
    }
    setPhase('out');
    window.setTimeout(() => {
      setIdx((i) => i + 1);
      setPhase('in');
    }, 280);
  };

  const handleGoAchievements = () => {
    window.location.assign('/progress/achievements');
  };

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8 flex items-center justify-center">
      <div className="w-full max-w-lg">
        {showResult ? (
          <TrainerResultCard
            title={props.title}
            presetId={props.presetId}
            presetTitle={props.presetTitle}
            result={props.result}
            canGoNext={props.canGoNext}
            nextPresetTitle={props.nextPresetTitle}
            onNextLevel={props.onNextLevel}
            onRetry={props.onRetry}
            onBackToSelect={props.onBackToSelect}
          />
        ) : current ? (
          <div
            className={cn(
              'card-elevated p-6 md:p-8 text-center space-y-6',
              phase === 'in' ? 'animate-achievement-in' : 'animate-achievement-out'
            )}
          >
            <div
              className={cn(
                'w-20 h-20 mx-auto rounded-full flex items-center justify-center',
                current.__silent ? 'bg-primary/10' : 'bg-success/20'
              )}
            >
              {current.__silent ? <Sparkles className="w-10 h-10 text-primary" /> : <Icon className="w-10 h-10 text-success" />}
            </div>

            <div className="space-y-1">
              <div className="text-sm md:text-base font-semibold text-muted-foreground">{current.__silent ? 'Новый этап' : 'Новое достижение'}</div>
              <div className="text-2xl md:text-3xl font-extrabold text-foreground">{current.title}</div>
              <div className="text-muted-foreground">{current.description}</div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleNext} size="lg" className="w-full" disabled={phase === 'out'}>
                Хорошо
              </Button>
              {!current.__silent ? (
                <Button variant="outline" size="lg" onClick={handleGoAchievements} className="w-full" disabled={phase === 'out'}>
                  Мои достижения
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

