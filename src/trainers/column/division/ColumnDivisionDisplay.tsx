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

  const colsLeft = dividendStr.length;
  const sepCol = colsLeft;
  const colsRight = Math.max(divisorStr.length, quotientStr.length);
  const totalCols = colsLeft + 1 + colsRight;

  const emptyRow = () => Array.from({ length: totalCols }, () => null as any);
  const rows: { cells: any[]; topLineFromCol?: number }[] = [];
  const ensureRow = (idx: number) => {
    while (rows.length <= idx) rows.push({ cells: emptyRow() });
    return rows[idx];
  };

  // Row 0: dividend | divisor
  {
    const r0 = ensureRow(0);
    dividendStr.split('').forEach((digit, idx) => {
      r0.cells[idx] = renderDigitCell(digit);
    });
    r0.cells[sepCol] = (
      <div className="w-10 h-12 flex items-center justify-center">
        <div className="w-0.5 h-full bg-foreground" />
      </div>
    );
    divisorStr.split('').forEach((digit, idx) => {
      r0.cells[sepCol + 1 + idx] = renderDigitCell(digit);
    });
  }

  // Row 1: quotient row (right, with top bar) + first subtraction (left)
  {
    const r1 = ensureRow(1);
    r1.topLineFromCol = sepCol;
    quotientStr.split('').forEach((_, idx) => {
      const quotientSteps = getStepsByTypeAndPosition('quotient_digit', idx);
      const step = quotientSteps[0];
      r1.cells[sepCol + 1 + idx] =
        step && !step.isCompleted ? (
          renderInputCell(step)
        ) : (
          <div className={cn('w-10 h-12 flex items-center justify-center font-bold', step?.isCompleted && 'text-success')}>{quotientDigits[idx] ?? ''}</div>
        );
    });

    // keep the vertical bar visible in the quotient row too
    r1.cells[sepCol] = (
      <div className="w-10 h-12 flex items-center justify-center">
        <div className="w-0.5 h-full bg-foreground" />
      </div>
    );
  }

  let nextRow = 2;
  for (let wsIdx = 0; wsIdx <= state.currentWorkingStep && wsIdx < workingSteps.length; wsIdx++) {
    const ws = workingSteps[wsIdx];
    const quotientStep = getStepsByTypeAndPosition('quotient_digit', wsIdx)[0];
    const quotientCompleted = quotientStep?.isCompleted;

    const multiplySteps = getStepsByTypeAndPosition('multiply_result', wsIdx);
    const subtractSteps = getStepsByTypeAndPosition('subtract_result', wsIdx);

    const rightEdgeIndex = calculateWorkingStepOffset(wsIdx);
    const multiplyDigits = ws.multiplyResult.toString().length;
    const subtractDigits = ws.subtractResult.toString().length;
    const multiplyStartCol = Math.max(0, rightEdgeIndex - multiplyDigits + 1);
    const subtractStartCol = Math.max(0, rightEdgeIndex - subtractDigits + 1);
    const minusCol = Math.max(0, multiplyStartCol - 1);
    const broughtDownCol = Math.min(colsLeft - 1, rightEdgeIndex + 1);

    const multiplyRowIdx = wsIdx === 0 ? 1 : nextRow;
    const multiplyRow = ensureRow(multiplyRowIdx);

    if (quotientCompleted) {
      multiplyRow.cells[minusCol] = renderDigitCell('−', 'text-muted-foreground');
      multiplySteps.forEach((step, i) => {
        multiplyRow.cells[multiplyStartCol + i] = step.isCompleted ? renderDigitCell(getInputValue(step.id) ?? '', 'text-success') : renderInputCell(step);
      });
    }

    const multiplyDone = multiplySteps.length > 0 && multiplySteps.every((s) => s.isCompleted);
    if (multiplyDone) {
      const lineRowIdx = multiplyRowIdx + 1;
      const subRowIdx = multiplyRowIdx + 2;
      const lineRow = ensureRow(lineRowIdx);
      const subRow = ensureRow(subRowIdx);

      for (let c = multiplyStartCol; c < multiplyStartCol + multiplyDigits; c++) {
        lineRow.cells[c] = <div className="h-0.5 bg-foreground w-full" />;
      }

      subtractSteps.forEach((step, i) => {
        subRow.cells[subtractStartCol + i] = step.isCompleted ? renderDigitCell(getInputValue(step.id) ?? '', 'text-success') : renderInputCell(step);
      });

      const hasNextDigit = ws.broughtDown !== undefined;
      const subtractDone = subtractSteps.length > 0 && subtractSteps.every((s) => s.isCompleted);
      if (hasNextDigit && subtractDone && broughtDownCol >= 0) {
        subRow.cells[broughtDownCol] = <div className="w-10 h-12 flex items-center justify-center font-bold text-primary">{ws.broughtDown}</div>;
      }

      if (wsIdx > 0) nextRow = subRowIdx + 1;
      if (wsIdx === 0) nextRow = Math.max(nextRow, subRowIdx + 1);
    } else if (wsIdx > 0) {
      nextRow = Math.max(nextRow, multiplyRowIdx + 1);
    }
  }

  return (
    <div className="card-elevated py-6 px-8 md:py-8 md:px-10 inline-flex w-fit min-h-[248px] sm:min-h-[280px] items-start justify-center">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${totalCols}, ${cellWidth}rem)` }}>
        {rows.map((r, rowIdx) =>
          r.cells.map((node, colIdx) => (
            <div
              key={`r${rowIdx}-c${colIdx}`}
              className={cn(
                'w-10 h-12 flex items-center justify-center',
                r.topLineFromCol !== undefined && colIdx >= r.topLineFromCol ? 'border-t-2 border-foreground' : null,
              )}
            >
              {node}
            </div>
          )),
        )}
      </div>
    </div>
  );
}

