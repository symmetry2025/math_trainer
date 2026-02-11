'use client';

import type { AdditionInputStep, ColumnAdditionState } from './types';
import { cn } from '../../../lib/utils';

interface ColumnAdditionDisplayProps {
  state: ColumnAdditionState;
  currentStep: AdditionInputStep | null;
}

export default function ColumnAdditionDisplay({ state, currentStep }: ColumnAdditionDisplayProps) {
  const { problem, result, carries } = state;
  const { numbers } = problem;

  const getDigits = (num: number): number[] => num.toString().split('').map(Number);

  const total = numbers.reduce((sum, n) => sum + n, 0);
  const totalDigits = getDigits(total);

  const maxNumberLength = Math.max(...numbers.map((n) => n.toString().length));
  const maxWidth = Math.max(maxNumberLength + 1, totalDigits.length + 1);

  const renderCell = (value: number | null | string, isHighlighted: boolean = false, isEmpty: boolean = false) => (
    <div
      className={cn(
        'w-9 h-[42px] md:w-10 md:h-[42px] flex items-center justify-center',
        'text-2xl md:text-3xl font-bold',
        isEmpty && 'opacity-0',
        isHighlighted && 'bg-primary/20 rounded-lg animate-pulse ring-2 ring-primary',
        !isEmpty && value !== null && 'text-foreground',
      )}
    >
      {value !== null && !isEmpty ? value : ''}
    </div>
  );

  const renderInputCell = (isActive: boolean, isSmall: boolean = false) => (
    <div
      className={cn(
        'flex items-center justify-center',
        'border-2 border-dashed rounded-lg',
        isSmall ? 'w-6 h-7 md:w-7 md:h-7' : 'w-9 h-[42px] md:w-10 md:h-[42px]',
        isActive ? 'border-primary bg-primary/10 animate-pulse' : 'border-muted-foreground/30',
      )}
    >
      <span className={cn('font-bold', isSmall ? 'text-xs md:text-sm' : 'text-2xl md:text-3xl', isActive ? 'text-primary' : 'text-muted-foreground')}>
        ?
      </span>
    </div>
  );

  const renderCarries = () => {
    const isCarryStep = currentStep?.type === 'carry';
    return (
      <div className="flex justify-end h-6 md:h-7 mb-0.5">
        <div className="w-9 md:w-10" />

        {totalDigits.map((_, i) => {
          const position = totalDigits.length - 1 - i;
          const carryValue = carries.get(`${position}`);
          const isCurrentCarryInput = isCarryStep && currentStep.position === position;

          if (isCurrentCarryInput) {
            return (
              <div key={`carry-${i}`} className="w-9 md:w-10 flex justify-center items-end pb-0.5">
                <div className="translate-y-1">{renderInputCell(true, true)}</div>
              </div>
            );
          }

          if (carryValue !== undefined && carryValue !== null) {
            return (
              <div key={`carry-${i}`} className="w-9 md:w-10 flex justify-center items-end pb-0.5">
                <span className="text-xs md:text-sm font-bold leading-none text-primary/70 translate-y-1">{carryValue}</span>
              </div>
            );
          }

          return <div key={`carry-${i}`} className="w-9 md:w-10" />;
        })}
      </div>
    );
  };

  const lineWidthPx = maxWidth * 40; // w-9 (36px) + gap-ish; close enough for crisp line without stretching the card

  return (
    <div className="bg-card rounded-2xl py-4 px-8 md:py-6 md:px-10 shadow-md border border-border inline-flex w-fit min-h-[248px] sm:min-h-[280px] items-center justify-center">
      <div className="flex flex-col items-end justify-center space-y-0.5">
        {renderCarries()}

        {numbers.map((num, rowIndex) => {
          const digits = getDigits(num);
          const paddingCells = maxWidth - digits.length - 1;

          return (
            <div key={`number-${rowIndex}`} className="flex relative">
              {rowIndex === numbers.length - 1 ? (
                <div className="absolute -left-2 text-xl md:text-3xl font-bold text-foreground" style={{ top: '-17px' }}>
                  +
                </div>
              ) : null}

              {Array.from({ length: paddingCells + 1 }).map((_, i) => (
                <div key={`pad-${rowIndex}-${i}`} className="w-9 md:w-10" />
              ))}

              {digits.map((digit, i) => (
                <div key={`digit-${rowIndex}-${i}`}>{renderCell(digit)}</div>
              ))}
            </div>
          );
        })}

        <div className="h-0.5 bg-foreground my-1.5" style={{ width: `${lineWidthPx}px` }} />

        <div className="flex">
          <div className="w-9 md:w-10" />
          {Array.from({ length: Math.max(0, maxWidth - totalDigits.length - 1) }).map((_, i) => (
            <div key={`result-pad-${i}`} className="w-9 md:w-10" />
          ))}

          {totalDigits.map((_digit, i) => {
            const position = totalDigits.length - 1 - i;
            const isCurrentInput = currentStep?.type === 'result' && currentStep.position === position;
            const filledValue = result[position];

            return <div key={`result-${i}`}>{isCurrentInput ? renderInputCell(true) : renderCell(filledValue !== undefined ? filledValue : null)}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

