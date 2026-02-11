'use client';

import { cn } from '../../../lib/utils';
import type { ColumnSubtractionState, SubtractionInputStep } from './types';

export default function ColumnSubtractionDisplay({ state, currentStep }: { state: ColumnSubtractionState; currentStep: SubtractionInputStep | null }) {
  const { problem, result, borrows } = state;
  const { minuend, subtrahend } = problem;
  const difference = minuend - subtrahend;

  const minuendDigits = minuend.toString().split('').map(Number);
  const subtrahendDigits = subtrahend.toString().split('').map(Number);
  const resultDigits = difference.toString().split('').map(Number);

  const maxWidth = Math.max(minuendDigits.length, subtrahendDigits.length, resultDigits.length);

  const renderCell = (value: number | null | string, isHighlighted: boolean = false, isEmpty: boolean = false) => (
    <div
      className={cn(
        'w-9 h-11 md:w-10 md:h-12 flex items-center justify-center',
        'text-2xl md:text-3xl font-bold',
        isEmpty && 'opacity-0',
        isHighlighted && 'bg-primary/20 rounded-lg animate-pulse ring-2 ring-primary',
        !isEmpty && value !== null && 'text-foreground',
      )}
    >
      {value !== null && !isEmpty ? value : ''}
    </div>
  );

  const renderInputCell = (isActive: boolean) => (
    <div
      className={cn(
        'flex items-center justify-center border-2 border-dashed rounded-lg',
        'w-9 h-11 md:w-10 md:h-12',
        isActive ? 'border-primary bg-primary/10 animate-pulse' : 'border-muted-foreground/30',
      )}
    >
      <span className={cn('font-bold text-2xl md:text-3xl', isActive ? 'text-primary' : 'text-muted-foreground')}>?</span>
    </div>
  );

  const isBorrowStep = currentStep?.type === 'borrow';
  const isResultStep = currentStep?.type === 'result';

  const renderBorrowsRow = () => (
    <div className="flex justify-end h-7 md:h-8 mb-1">
      {Array.from({ length: maxWidth }).map((_, i) => {
        const position = maxWidth - 1 - i;
        const v = borrows.get(String(position));
        const isActive = isBorrowStep && currentStep.position === position;
        if (isActive) {
          return (
            <div key={`b-${i}`} className="w-9 md:w-10 flex justify-center items-center">
              <div className="w-6 h-7 md:w-7 md:h-8 flex items-center justify-center rounded-full border-2 border-primary bg-primary/10 animate-pulse text-xs font-bold text-primary">
                ?
              </div>
            </div>
          );
        }
        if (v !== undefined && v !== null) {
          return (
            <div key={`b-${i}`} className="w-9 md:w-10 flex justify-center items-center">
              <span className="text-xs md:text-sm font-bold text-destructive/80">{v}</span>
            </div>
          );
        }
        return <div key={`b-${i}`} className="w-9 md:w-10" />;
      })}
    </div>
  );

  return (
    <div className="bg-card rounded-2xl py-4 px-8 md:py-6 md:px-10 shadow-md border border-border inline-flex w-fit min-h-[248px] sm:min-h-[280px] items-center justify-center">
      <div className="flex flex-col items-end justify-center space-y-1">
        {renderBorrowsRow()}

        <div className="flex">
          {Array.from({ length: maxWidth - minuendDigits.length }).map((_, i) => (
            <div key={`m-pad-${i}`} className="w-9 md:w-10" />
          ))}
          {minuendDigits.map((d, i) => (
            <div key={`m-${i}`}>{renderCell(d)}</div>
          ))}
        </div>

        <div className="flex relative">
          {/* operator does not occupy a grid cell */}
          <div className="absolute -left-3 text-2xl md:text-3xl font-bold text-muted-foreground" style={{ top: '-10px' }}>
            −
          </div>
          {Array.from({ length: maxWidth - subtrahendDigits.length }).map((_, i) => (
            <div key={`s-pad-${i}`} className="w-9 md:w-10" />
          ))}
          {subtrahendDigits.map((d, i) => (
            <div key={`s-${i}`}>{renderCell(d)}</div>
          ))}
        </div>

        <div className="h-0.5 bg-foreground my-2" style={{ width: `${maxWidth * 40}px` }} />

        <div className="flex">
          {Array.from({ length: maxWidth - resultDigits.length }).map((_, i) => (
            <div key={`r-pad-${i}`} className="w-9 md:w-10" />
          ))}
          {resultDigits.map((_d, i) => {
            const position = resultDigits.length - 1 - i;
            const filledValue = result[position];
            const isActive = isResultStep && currentStep.position === position;
            return <div key={`r-${i}`}>{isActive ? renderInputCell(true) : renderCell(filledValue !== null ? filledValue : null)}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

