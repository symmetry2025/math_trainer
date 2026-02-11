'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

import type { DrillAnswerStatus } from './types';
import { cn } from '../../../lib/utils';

export function DrillFeedbackTooltip(props: { status: DrillAnswerStatus; className?: string; placement?: 'aboveCard' | 'inline' }) {
  if (!props.status) return null;
  const isCorrect = props.status === 'correct';
  const placement = props.placement ?? 'aboveCard';
  const wrapperClass =
    placement === 'inline'
      ? 'w-full flex justify-center pointer-events-none'
      : 'absolute left-1/2 -translate-x-1/2 -top-4 -translate-y-full w-full flex justify-center pointer-events-none';
  return (
    <div className={cn(wrapperClass, props.className)}>
      <div
        className={cn(
          'max-w-full px-4 py-2 rounded-full border text-base text-center whitespace-normal break-words backdrop-blur-sm animate-toast-rise',
          isCorrect ? 'bg-success/20 border-success/20 text-success' : 'bg-destructive/10 border-destructive/20 text-destructive',
        )}
      >
        {isCorrect ? (
          <div className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <span className="font-medium">Правильно!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="font-medium">Неверно</span>
          </div>
        )}
      </div>
    </div>
  );
}

