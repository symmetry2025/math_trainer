'use client';

import type { SessionResult } from '../types';
import { TrainerResultCard } from './TrainerResultCard';

export function TrainerResultScreen(props: {
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
  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <TrainerResultCard {...props} />
      </div>
    </div>
  );
}

