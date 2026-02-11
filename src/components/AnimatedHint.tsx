'use client';

import { useEffect, useState } from 'react';

import { cn } from '../lib/utils';

export function AnimatedHint(props: { text: string; className?: string; placeholderClassName?: string }) {
  const [shown, setShown] = useState<string>(props.text || '');
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const next = props.text || '';
    if (next === shown) return;

    // If nothing shown, just show next.
    if (!shown) {
      setShown(next);
      setPhase('in');
      return;
    }

    setPhase('out');
    const t = window.setTimeout(() => {
      setShown(next);
      setPhase('in');
    }, 180);
    return () => window.clearTimeout(t);
  }, [props.text, shown]);

  // Always keep an element in the DOM to avoid layout/DOM churn in tooltip usage.
  const display = shown || '\u00A0';
  const isEmpty = !shown;
  return (
    <div
      className={cn(
        phase === 'in' ? 'animate-hint-in' : 'animate-hint-out',
        isEmpty && 'opacity-0',
        props.className,
        props.placeholderClassName,
      )}
    >
      {display}
    </div>
  );
}

