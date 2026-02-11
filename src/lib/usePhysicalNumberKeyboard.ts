'use client';

import { useEffect } from 'react';

function isTypingTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = String(t.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (t.isContentEditable) return true;
  return false;
}

export function usePhysicalNumberKeyboard(args: {
  enabled?: boolean;
  onDigit: (n: number) => void;
  onBackspace?: () => void;
  onEnter?: () => void;
}) {
  const enabled = args.enabled ?? true;
  const { onDigit, onBackspace, onEnter } = args;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        onDigit(Number.parseInt(e.key, 10));
        return;
      }
      if (e.key === 'Backspace') {
        if (!onBackspace) return;
        e.preventDefault();
        onBackspace();
        return;
      }
      if (e.key === 'Enter') {
        if (!onEnter) return;
        e.preventDefault();
        onEnter();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onDigit, onBackspace, onEnter]);
}

