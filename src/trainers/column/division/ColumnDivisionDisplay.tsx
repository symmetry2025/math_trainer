'use client';

import { cn } from '../../../lib/utils';
import type { ColumnDivisionState, DivisionStep } from './types';

export default function ColumnDivisionDisplay({ state, currentStep }: { state: ColumnDivisionState; currentStep: DivisionStep | null }) {
  const { problem, steps, userInputs, quotientDigits, workingSteps } = state;
  const dividendStr = problem.dividend.toString();
  const divisorStr = problem.divisor.toString();
  const quotientStr = problem.quotient.toString();

  // Visual grid geometry (rem)
  const cellWidth = 2.4; // slightly tighter horizontal spacing
  const sepWidth = 0.6; // spacing for vertical bar column
  const cellH = 2.5; // row height (matches h-10)
  const cellHeightClass = 'h-10';
  const cellTextClass = 'text-2xl font-bold leading-none';

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
          // Slight inset so the box does not "grab" separator lines (canonical across all inputs).
          'w-[calc(100%-0.35rem)] h-[calc(100%-0.35rem)] flex items-center justify-center text-2xl font-bold leading-none rounded-lg border-2 transition-all',
          completed && 'bg-muted/30 border-muted-foreground/20 text-foreground',
          active && !completed && 'bg-primary/20 border-primary animate-pulse',
          !active && !completed && 'bg-muted/30 border-transparent',
          className,
        )}
      >
        {completed ? value : active ? '?' : ''}
      </div>
    );
  };

  const renderDigitCell = (digit: string | number | null | undefined, className?: string) => (
    <span className={cn(className)}>{digit ?? ''}</span>
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
  const rows: { cells: any[] }[] = [];
  const ensureRow = (idx: number) => {
    while (rows.length <= idx) rows.push({ cells: emptyRow() });
    return rows[idx];
  };

  const vLineX = colsLeft * cellWidth + sepWidth / 2;
  const rightEndX = colsLeft * cellWidth + sepWidth + colsRight * cellWidth;

  const hLines: { topRow: number; leftRem: number; widthRem: number }[] = [];
  const minusMarks: { leftRem: number; topRem: number }[] = [];
  // Top line (above quotient row)
  hLines.push({ topRow: 1, leftRem: vLineX, widthRem: Math.max(0, rightEndX - vLineX) });

  // Row 0: dividend | divisor
  {
    const r0 = ensureRow(0);
    dividendStr.split('').forEach((digit, idx) => {
      r0.cells[idx] = renderDigitCell(digit);
    });
    r0.cells[sepCol] = null;
    divisorStr.split('').forEach((digit, idx) => {
      r0.cells[sepCol + 1 + idx] = renderDigitCell(digit);
    });
  }

  // Row 1: quotient row (right) + first subtraction (left; wsIdx=0)
  {
    const r1 = ensureRow(1);
    quotientStr.split('').forEach((_, idx) => {
      const step = getStepsByTypeAndPosition('quotient_digit', idx)[0];
      r1.cells[sepCol + 1 + idx] = step && !step.isCompleted ? renderInputCell(step) : renderDigitCell(quotientDigits[idx] ?? '');
    });
    r1.cells[sepCol] = null;
  }

  let nextRow = 2;
  for (let wsIdx = 0; wsIdx <= state.currentWorkingStep && wsIdx < workingSteps.length; wsIdx++) {
    const ws = workingSteps[wsIdx];
    const quotientStep = getStepsByTypeAndPosition('quotient_digit', wsIdx)[0];
    const quotientCompleted = quotientStep?.isCompleted;

    const multiplySteps = getStepsByTypeAndPosition('multiply_result', wsIdx);
    const subtractSteps = getStepsByTypeAndPosition('subtract_result', wsIdx);
    const bringDownStep = getStepsByTypeAndPosition('bring_down', wsIdx)[0];

    const rightEdgeIndex = calculateWorkingStepOffset(wsIdx);
    const currentDigits = ws.currentNumber.toString().length;
    const currentStartCol = Math.max(0, rightEdgeIndex - currentDigits + 1);
    const multiplyDigits = ws.multiplyResult.toString().length;
    const subtractDigits = ws.subtractResult.toString().length;
    const multiplyStartCol = Math.max(0, rightEdgeIndex - multiplyDigits + 1);
    const subtractStartCol = Math.max(0, rightEdgeIndex - subtractDigits + 1);
    const broughtDownCol = Math.min(colsLeft - 1, rightEdgeIndex + 1);

    const multiplyRowIdx = wsIdx === 0 ? 1 : nextRow;
    const multiplyRow = ensureRow(multiplyRowIdx);

    if (quotientCompleted) {
      // Operator must not occupy a grid cell (canonical like other column trainers).
      // Place it to the left of the *current number* (so 1-digit under 2-digit still has minus left of tens).
      minusMarks.push({
        leftRem: currentStartCol * cellWidth - 0.9,
        topRem: multiplyRowIdx * cellH - 0.9,
      });
      multiplySteps.forEach((step, i) => {
        multiplyRow.cells[multiplyStartCol + i] = step.isCompleted ? renderDigitCell(getInputValue(step.id) ?? '') : renderInputCell(step);
      });
    }

    const multiplyDone = multiplySteps.length > 0 && multiplySteps.every((s) => s.isCompleted);
    if (multiplyDone) {
      const subRowIdx = multiplyRowIdx + 1;
      const subRow = ensureRow(subRowIdx);

      const hasNextDigit = ws.broughtDown !== undefined;
      const endCol = hasNextDigit ? broughtDownCol : rightEdgeIndex;
      // Subtraction line must cover the whole current number width (tens + ones), regardless of result width.
      hLines.push({ topRow: subRowIdx, leftRem: currentStartCol * cellWidth, widthRem: Math.max(0, (endCol - currentStartCol + 1) * cellWidth) });

      subtractSteps.forEach((step, i) => {
        subRow.cells[subtractStartCol + i] = step.isCompleted ? renderDigitCell(getInputValue(step.id) ?? '') : renderInputCell(step);
      });

      const subtractDone = subtractSteps.length > 0 && subtractSteps.every((s) => s.isCompleted);
      if (hasNextDigit && subtractDone && broughtDownCol >= 0) {
        subRow.cells[broughtDownCol] = bringDownStep && !bringDownStep.isCompleted ? renderInputCell(bringDownStep) : renderDigitCell(ws.broughtDown ?? '');
      }

      nextRow = subRowIdx + 1;
    } else if (wsIdx > 0) {
      nextRow = Math.max(nextRow, multiplyRowIdx + 1);
    }
  }

  return (
    <div className="card-elevated py-6 px-8 md:py-8 md:px-10 inline-flex w-fit min-h-[248px] sm:min-h-[280px] items-start justify-center">
      <div className="relative">
        {/* Minus signs as absolute overlays (do not consume matrix cells) */}
        {minusMarks.map((m, idx) => (
          <div
            key={`minus-${idx}`}
            className="absolute z-20 pointer-events-none text-2xl md:text-3xl font-bold text-muted-foreground"
            style={{ left: `${m.leftRem}rem`, top: `${m.topRem}rem` }}
          >
            −
          </div>
        ))}

        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${colsLeft}, ${cellWidth}rem) ${sepWidth}rem repeat(${colsRight}, ${cellWidth}rem)`,
          }}
        >
          {rows.map((r, rowIdx) =>
            r.cells.map((node, colIdx) => (
              <div key={`r${rowIdx}-c${colIdx}`} className={cn('w-full flex items-center justify-center', cellHeightClass, cellTextClass)}>
                {node}
              </div>
            )),
          )}
        </div>

        {/* Vertical bar: stop after quotient row */}
        <div className="absolute top-0 w-0.5 bg-foreground" style={{ left: `${vLineX}rem`, height: `${2 * cellH}rem` }} />

        {/* Horizontal separators (absolute; do not take matrix rows) */}
        {hLines.map((l, idx) => (
          <div
            key={`h-${idx}`}
            className="absolute h-0.5 bg-foreground"
            style={{ top: `${l.topRow * cellH}rem`, left: `${l.leftRem}rem`, width: `${Math.max(0, l.widthRem)}rem` }}
          />
        ))}
      </div>
    </div>
  );
}

