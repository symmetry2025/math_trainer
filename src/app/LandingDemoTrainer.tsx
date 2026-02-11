'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ArrowRight, RotateCcw } from 'lucide-react';

import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { prepareUniqueList } from '../lib/uniqueProblems';

type DemoProblem = {
  a: number;
  b: number;
  answer: number;
  options: number[];
  key: string;
};

function randInt(min: number, max: number) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  if (b < a) return a;
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function makeOptions(answer: number): number[] {
  const set = new Set<number>();
  set.add(answer);
  while (set.size < 4) {
    const delta = randInt(-9, 9);
    const candidate = Math.max(0, answer + delta);
    set.add(candidate);
  }
  const arr = Array.from(set);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function makeProblems(count: number): DemoProblem[] {
  const n = Math.max(1, Math.min(20, Math.floor(Number(count || 10))));
  return prepareUniqueList({
    count: n,
    make: () => {
      const a = randInt(2, 9);
      const b = randInt(2, 9);
      const answer = a * b;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return { a, b, answer, options: makeOptions(answer), key: `${lo}x${hi}` };
    },
    keyOf: (p) => p.key,
  });
}

export function LandingDemoTrainer(props: { total?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const total = Math.max(1, Math.min(20, Math.floor(Number(props.total ?? 10))));
  const [runKey, setRunKey] = useState(0);
  const problems = useMemo(() => makeProblems(total), [total, runKey]);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [status, setStatus] = useState<'correct' | 'wrong' | null>(null);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const done = idx >= problems.length;

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="problem-display inline-block text-4xl md:text-5xl font-bold text-center mb-4">
            × = <span className="inline-block min-w-[64px] tabular-nums text-muted-foreground">?</span>
          </div>
          <div className="w-[360px] max-w-full mx-auto">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <button key={i} type="button" disabled className="answer-option !px-0 !py-3 opacity-50">
                  &nbsp;
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="font-medium text-primary tabular-nums">0 из {total}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      </div>
    );
  }

  const reset = () => {
    setRunKey((k) => k + 1);
    setIdx(0);
    setPicked(null);
    setStatus(null);
    setCorrect(0);
    setMistakes(0);
  };

  if (done) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-1.5">
          <div className="text-2xl font-extrabold text-foreground">Готово!</div>
          <div className="text-sm text-muted-foreground">
            Верно: <span className="font-semibold text-foreground tabular-nums">{correct}</span> /{' '}
            <span className="tabular-nums">{problems.length}</span>
            {mistakes > 0 ? (
              <>
                {' '}
                • Ошибки: <span className="font-semibold text-foreground tabular-nums">{mistakes}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
            Ещё раз
          </Button>
          <Link href="/login?next=/addition">
            <Button>
              Начать бесплатно
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const current = problems[idx]!;

  const onPick = (v: number) => {
    if (picked !== null) return;
    setPicked(v);
    const ok = v === current.answer;
    setStatus(ok ? 'correct' : 'wrong');
    if (ok) setCorrect((c) => c + 1);
    else setMistakes((m) => m + 1);
    window.setTimeout(() => {
      setIdx((i) => i + 1);
      setPicked(null);
      setStatus(null);
    }, 550);
  };

  const pct = problems.length > 0 ? Math.round((idx / problems.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div
          className={cn(
            'problem-display inline-block text-4xl md:text-5xl font-bold text-center mb-4',
            status === 'correct' && 'text-success',
            status === 'wrong' && 'animate-shake text-destructive',
          )}
        >
          {current.a} × {current.b} ={' '}
          <span className={cn('inline-block min-w-[64px] tabular-nums', picked === null ? 'text-muted-foreground' : 'text-foreground')}>
            {picked !== null ? String(picked) : '?'}
          </span>
        </div>

        <div className="w-[360px] max-w-full mx-auto">
          <div className="grid grid-cols-2 gap-2">
            {current.options.map((opt) => {
              const isCorrect = opt === current.answer;
              const showCorrect = picked !== null && isCorrect;
              const showWrong = picked !== null && picked === opt && !isCorrect;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onPick(opt)}
                  disabled={picked !== null}
                  className={cn(
                    'answer-option !px-0 !py-3',
                    showCorrect && 'answer-correct',
                    showWrong && 'answer-wrong',
                    picked !== null && isCorrect && picked !== opt && 'answer-correct',
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Прогресс</span>
          <span className="font-medium text-primary tabular-nums">
            {Math.min(problems.length, idx + 1)} из {problems.length}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

