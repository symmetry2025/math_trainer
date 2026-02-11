'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

import { AnimatedHint } from '../../../components/AnimatedHint';
import NumberKeyboard from '../../../components/NumberKeyboard';
import { Button } from '../../../components/ui/button';
import { usePhysicalNumberKeyboard } from '../../../lib/usePhysicalNumberKeyboard';
import { playCorrectSfx, playWrongSfx } from '../../../lib/sfx';
import { cn } from '../../../lib/utils';
import { prepareUniqueList } from '../../../lib/uniqueProblems';
import ColumnDisplay from './ColumnDisplay';
import { generateProblem, useColumnMultiplication } from './useColumnMultiplication';

interface ColumnMultiplicationSessionProps {
  difficulty?: 'easy' | 'medium' | 'hard';
  totalProblems?: number;
  onComplete?: (mistakes: number) => void;
  onProblemSolved?: (solvedCount: number, totalProblems: number) => void;
  hideHeader?: boolean;
  hideProgress?: boolean;
  embedded?: boolean;
  onBack?: () => void;
}

export default function ColumnMultiplicationSession({
  difficulty = 'medium',
  totalProblems = 10,
  onComplete,
  onProblemSolved,
  hideHeader = false,
  hideProgress = false,
  embedded = false,
  onBack,
}: ColumnMultiplicationSessionProps) {
  const { state, currentStep, handleInput, reset } = useColumnMultiplication(difficulty);

  const [solvedProblems, setSolvedProblems] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showingSuccess, setShowingSuccess] = useState(false);
  const [showingWrong, setShowingWrong] = useState(false);
  const [cardAnimating, setCardAnimating] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const [preparedProblems, setPreparedProblems] = useState(() => [] as Array<ReturnType<typeof generateProblem>>);

  const processedProblemRef = useRef<string | null>(null);
  const prevMistakesRef = useRef(0);
  const prevShowingSuccessRef = useRef(false);
  const wrongTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onProblemSolvedRef = useRef(onProblemSolved);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onProblemSolvedRef.current = onProblemSolved;
  }, [onComplete, onProblemSolved]);

  // SFX: wrong answer when mistakes increase.
  useEffect(() => {
    const next = state.mistakesCount;
    if (next > prevMistakesRef.current) {
      playWrongSfx();
      setShowingWrong(true);
      if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = window.setTimeout(() => setShowingWrong(false), 600);
    }
    prevMistakesRef.current = next;
  }, [state.mistakesCount]);
  useEffect(() => () => (wrongTimerRef.current ? window.clearTimeout(wrongTimerRef.current) : undefined), []);

  // SFX: correct answer when success banner is shown.
  useEffect(() => {
    if (showingSuccess && !prevShowingSuccessRef.current) playCorrectSfx();
    prevShowingSuccessRef.current = showingSuccess;
  }, [showingSuccess]);

  const problemId = `${state.problem.multiplicand}-${state.problem.multiplier}`;

  useEffect(() => {
    if (state.isComplete && !sessionComplete && processedProblemRef.current !== problemId) {
      processedProblemRef.current = problemId;

      const newSolved = solvedProblems + 1;
      const newMistakes = totalMistakes + state.mistakesCount;

      setSolvedProblems(newSolved);
      setTotalMistakes(newMistakes);
      setShowingSuccess(true);
      setCardAnimating(true);

      onProblemSolvedRef.current?.(newSolved, totalProblems);

      if (newSolved >= totalProblems) {
        setSessionComplete(true);
        onCompleteRef.current?.(newMistakes);
      } else {
        setTimeout(() => {
          setShowingSuccess(false);
          setCardAnimating(false);
          setCardKey((prev) => prev + 1);
          const next = preparedProblems[newSolved];
          reset(difficulty, next);
        }, 600);
      }
    }
  }, [state.isComplete, problemId, solvedProblems, totalProblems, totalMistakes, state.mistakesCount, sessionComplete, reset, difficulty, preparedProblems]);

  usePhysicalNumberKeyboard({
    enabled: !state.isComplete,
    onDigit: handleInput,
  });

  const handleFullReset = useCallback(() => {
    setSolvedProblems(0);
    setTotalMistakes(0);
    setSessionComplete(false);
    setShowingSuccess(false);
    setCardAnimating(false);
    setCardKey((prev) => prev + 1);
    processedProblemRef.current = null;
    const list = prepareUniqueList({
      count: totalProblems,
      make: () => generateProblem(difficulty),
      keyOf: (p) => {
        const lo = Math.min(p.multiplicand, p.multiplier);
        const hi = Math.max(p.multiplicand, p.multiplier);
        return `${lo}x${hi}`;
      },
    });
    setPreparedProblems(list);
    reset(difficulty, list[0]);
  }, [reset, difficulty]);

  useEffect(() => {
    if (preparedProblems.length === totalProblems) return;
    const list = prepareUniqueList({
      count: totalProblems,
      make: () => generateProblem(difficulty),
      keyOf: (p) => {
        const lo = Math.min(p.multiplicand, p.multiplier);
        const hi = Math.max(p.multiplicand, p.multiplier);
        return `${lo}x${hi}`;
      },
    });
    setPreparedProblems(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalProblems, difficulty]);

  useEffect(() => {
    if (!preparedProblems[0]) return;
    if (solvedProblems !== 0) return;
    if (sessionComplete) return;
    if (processedProblemRef.current) return;
    reset(difficulty, preparedProblems[0]);
  }, [preparedProblems, solvedProblems, sessionComplete, reset, difficulty]);

  const progress = Math.round((solvedProblems / totalProblems) * 100);

  const getHintText = () => {
    if (!currentStep) return '';

    const { problem } = state;
    const multiplierDigits = problem.multiplier.toString().split('').map(Number).reverse();

    if (currentStep.type === 'carry') return 'Что запоминаем?';
    if (currentStep.type === 'sum_carry') return 'Что запоминаем при сложении?';

    if (currentStep.row >= 0 && currentStep.type === 'result') {
      const currentMultiplierDigit = multiplierDigits[currentStep.row];
      const multiplicandDigits = problem.multiplicand.toString().split('').map(Number).reverse();
      const currentMultiplicandDigit = multiplicandDigits[currentStep.position];
      if (currentMultiplicandDigit !== undefined) return `${currentMultiplicandDigit} × ${currentMultiplierDigit} = ?`;
    }

    if (currentStep.row === -1 && currentStep.type === 'result') return 'Сложи цифры в столбике';
    return '';
  };

  const successMessage = showingSuccess && !sessionComplete;
  const wrongMessage = showingWrong && !sessionComplete && !successMessage;
  const hintText = currentStep && !successMessage ? getHintText() : '';

  return (
    <div className={cn('flex flex-col', embedded ? 'min-h-0 p-0' : 'min-h-screen p-4')}>
      {!hideHeader ? (
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
              <span className="text-sm font-medium text-muted-foreground">
                Примеров: {solvedProblems}/{totalProblems}
              </span>
            </div>

            <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full', totalMistakes > 0 ? 'bg-destructive/10' : 'bg-muted')}>
              <AlertCircle className={cn('w-4 h-4', totalMistakes > 0 ? 'text-destructive' : 'text-muted-foreground')} />
              <span className={cn('text-sm font-medium', totalMistakes > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                Ошибок: {totalMistakes + state.mistakesCount}
              </span>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={handleFullReset}>
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      ) : null}

      {!hideProgress ? (
        <div className="w-full h-2 bg-muted rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300 ease-out rounded-full" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className={cn('flex-1 flex flex-col relative', embedded && 'min-h-0')}>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 relative">
          <div className="w-full max-w-5xl mx-auto">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex justify-center">
                <div className="relative inline-block">
                  <div key={cardKey} className={cn(cardAnimating ? 'animate-card-exit' : 'animate-card-enter')}>
                    <ColumnDisplay state={state} currentStep={currentStep} />
                  </div>
                </div>
              </div>

              <div className="h-10 md:h-12 flex items-center justify-center text-base md:text-lg font-medium text-muted-foreground text-center">
                {successMessage || wrongMessage ? (
                  <div
                    className={cn(
                      'max-w-full px-4 py-2 rounded-full border text-base text-center whitespace-normal break-words backdrop-blur-sm animate-toast-rise',
                      successMessage ? 'bg-success/20 border-success/20 text-success' : 'bg-destructive/10 border-destructive/20 text-destructive',
                    )}
                  >
                    {successMessage ? (
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
                ) : (
                  <AnimatedHint text={hintText} className="text-muted-foreground" />
                )}
              </div>

              <div className="w-full flex justify-center">
                <div className="w-fit">
                  <NumberKeyboard onInput={handleInput} disabled={state.isComplete} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

