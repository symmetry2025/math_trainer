'use client';

import { cn } from '../../../lib/utils';
import type { ColumnDivisionState, DivisionStep } from './types';

export default function ColumnDivisionDisplay({ state, currentStep }: { state: ColumnDivisionState; currentStep: DivisionStep | null }) {
  const { problem, steps, userInputs, quotientDigits, workingSteps } = state;
  const dividendStr = problem.dividend.toString();
  const divisorStr = problem.divisor.toString();
  const quotientStr = problem.quotient.toString();

  const cellWidth = 2.5; // rem

  const getInputValue = (stepId: string): number | null => {
    return userInputs.get(stepId) ?? null;
  };

  const isCurrent = (step: DivisionStep): boolean => currentStep?.id === step.id;

  const getStepsByTypeAndPosition = (type: DivisionStep['type'], position: number) => {
    return steps.filter((s) => s.type === type && s.position === position);
  };

  const renderInputCell = (step: DivisionStep | undefined, className?: string) => {
    if (!step) return null;

    const value = getInputValue(step.id);
    const active = isCurrent(step);
    const completed = step.isCompleted;

    return (
      <div
        className={cn(
          'w-10 h-12 flex items-center justify-center text-2xl font-bold rounded-lg border-2 transition-all',
          completed && 'bg-success/20 border-success text-success',
          active && !completed && 'bg-primary/20 border-primary animate-pulse',
          !active && !completed && 'bg-muted/50 border-transparent',
          className,
        )}
      >
        {completed ? value : active ? '?' : ''}
      </div>
    );
  };

  const renderDigitCell = (digit: string | number, className?: string) => (
    <div className={cn('w-10 h-12 flex items-center justify-center text-2xl font-bold', className)}>{digit}</div>
  );

  const calculateWorkingStepOffset = (wsIdx: number): number => {
    let currentNumber = 0;
    let dividendIndex = 0;
    const dividendDigits = dividendStr.split('').map(Number);

    for (let i = 0; i <= wsIdx; i++) {
      while (currentNumber < problem.divisor && dividendIndex < dividendDigits.length) {
        currentNumber = currentNumber * 10 + dividendDigits[dividendIndex];
        dividendIndex++;
      }
      if (i < wsIdx) currentNumber = workingSteps[i].subtractResult;
    }

    return dividendIndex - 1;
  };

  return (
    <div className="card-elevated py-6 px-8 md:py-8 md:px-10 inline-flex w-fit min-h-[248px] sm:min-h-[280px] items-center justify-center">
      <div className="flex flex-col justify-center text-2xl">
        <div className="flex items-stretch">
          <div className="flex">
            {dividendStr.split('').map((digit, idx) => (
              <div key={`dividend-${idx}`}>{renderDigitCell(digit)}</div>
            ))}
          </div>

          <div className="flex flex-col">
            <div className="flex items-stretch h-12">
              <div className="w-1 bg-foreground" />
              <div className="flex items-center px-2">
                {divisorStr.split('').map((digit, idx) => (
                  <span key={`divisor-${idx}`} className="font-bold">
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex">
          <div style={{ width: `${dividendStr.length * cellWidth}rem` }} />
          <div className="flex flex-col">
            <div className="h-0.5 bg-foreground" style={{ width: `${(divisorStr.length + quotientStr.length) * cellWidth + 1}rem` }} />
            <div className="flex pl-2">
              {quotientStr.split('').map((_, idx) => {
                const quotientSteps = getStepsByTypeAndPosition('quotient_digit', idx);
                const step = quotientSteps[0];
                return (
                  <div key={`quotient-${idx}`}>
                    {step && !step.isCompleted ? (
                      renderInputCell(step)
                    ) : (
                      <div className={cn('w-10 h-12 flex items-center justify-center font-bold', step?.isCompleted && 'text-success')}>{quotientDigits[idx] ?? ''}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col mt-2">
          {workingSteps.map((ws, wsIdx) => {
            if (wsIdx > state.currentWorkingStep) return null;

            const quotientStep = getStepsByTypeAndPosition('quotient_digit', wsIdx)[0];
            const quotientCompleted = quotientStep?.isCompleted;

            const multiplySteps = getStepsByTypeAndPosition('multiply_result', wsIdx);
            const subtractSteps = getStepsByTypeAndPosition('subtract_result', wsIdx);

            const rightEdgeIndex = calculateWorkingStepOffset(wsIdx);
            const multiplyDigits = ws.multiplyResult.toString().length;
            const subtractDigits = ws.subtractResult.toString().length;

            const multiplyOffset = (rightEdgeIndex - multiplyDigits + 1) * cellWidth;
            const subtractOffset = (rightEdgeIndex - subtractDigits + 1) * cellWidth;

            const hasNextDigit = ws.broughtDown !== undefined;

            return (
              <div key={`working-${wsIdx}`} className="flex flex-col">
                {quotientCompleted ? (
                  <div className="flex items-center relative" style={{ paddingLeft: `${multiplyOffset}rem` }}>
                    <span className="absolute text-xl text-muted-foreground" style={{ left: `${multiplyOffset - 1.2}rem` }}>
                      −
                    </span>
                    {multiplySteps.map((step) => (
                      <div key={step.id}>{step.isCompleted ? renderDigitCell(getInputValue(step.id) ?? '', 'text-success') : renderInputCell(step)}</div>
                    ))}
                  </div>
                ) : null}

                {multiplySteps.every((s) => s.isCompleted) && multiplySteps.length > 0 ? (
                  <>
                    <div className="h-0.5 bg-foreground my-1" style={{ marginLeft: `${multiplyOffset}rem`, width: `${multiplyDigits * cellWidth}rem` }} />
                    <div className="flex relative" style={{ paddingLeft: `${subtractOffset}rem` }}>
                      {subtractSteps.map((step) => (
                        <div key={step.id}>{step.isCompleted ? renderDigitCell(getInputValue(step.id) ?? '', 'text-success') : renderInputCell(step)}</div>
                      ))}

                      {hasNextDigit && subtractSteps.every((s) => s.isCompleted) ? (
                        <div className="w-10 h-12 flex items-center justify-center font-bold text-primary">{ws.broughtDown}</div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

