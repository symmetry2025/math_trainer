'use client';

import type { ColumnMultiplicationState, InputStep } from './types';
import { cn } from '../../../lib/utils';

interface ColumnDisplayProps {
  state: ColumnMultiplicationState;
  currentStep: InputStep | null;
}

export default function ColumnDisplay({ state, currentStep }: ColumnDisplayProps) {
  const { problem, partialProducts, finalResult, allCarries, sumCarries } = state;

  const getDigits = (num: number): number[] => {
    return num.toString().split('').map(Number);
  };

  const multiplicandDigits = getDigits(problem.multiplicand);
  const multiplierDigits = getDigits(problem.multiplier);
  const totalResult = problem.multiplicand * problem.multiplier;
  const totalDigits = getDigits(totalResult);

  const maxWidth = Math.max(
    multiplicandDigits.length,
    multiplierDigits.length,
    totalDigits.length,
    ...partialProducts.map((pp) => pp.digits.length + pp.offset),
  );

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

  const renderInputCell = (isActive: boolean, isSmall: boolean = false) => (
    <div
      className={cn(
        'flex items-center justify-center',
        'border-2 border-dashed rounded-lg',
        isSmall ? 'w-6 h-7 md:w-7 md:h-8' : 'w-9 h-11 md:w-10 md:h-12',
        isActive ? 'border-primary bg-primary/10 animate-pulse' : 'border-muted-foreground/30',
      )}
    >
      <span className={cn('font-bold', isSmall ? 'text-xs md:text-sm' : 'text-2xl md:text-3xl', isActive ? 'text-primary' : 'text-muted-foreground')}>
        ?
      </span>
    </div>
  );

  const renderMultiplicationCarries = () => {
    const carryByPosition: Map<number, number[]> = new Map();

    allCarries.forEach((value, key) => {
      const [, posStr] = key.split('-');
      const position = Number.parseInt(posStr, 10);
      if (value !== null) {
        if (!carryByPosition.has(position)) carryByPosition.set(position, []);
        carryByPosition.get(position)!.push(value);
      }
    });

    const isCarryStep = currentStep?.type === 'carry' && currentStep.row >= 0;

    let maxCarriesInPosition = 0;
    carryByPosition.forEach((carries) => {
      maxCarriesInPosition = Math.max(maxCarriesInPosition, carries.length);
    });

    if (isCarryStep) {
      const position = currentStep.position;
      const currentCount = carryByPosition.get(position)?.length || 0;
      maxCarriesInPosition = Math.max(maxCarriesInPosition, currentCount + 1);
    }

    // Always reserve at least one carry row so the card height never jumps when carries appear.
    if (maxCarriesInPosition === 0) maxCarriesInPosition = 1;

    const rows: JSX.Element[] = [];

    for (let level = 0; level < maxCarriesInPosition; level++) {
      rows.unshift(
        <div key={`carry-row-${level}`} className="flex justify-end h-6 md:h-7" style={{ paddingRight: '0' }}>
          {Array.from({ length: maxWidth - multiplicandDigits.length }).map((_, i) => (
            <div key={`carry-pad-${level}-${i}`} className="w-9 md:w-10" />
          ))}

          {multiplicandDigits.map((_, i) => {
            const position = multiplicandDigits.length - 1 - i;
            const carriesAtPosition = carryByPosition.get(position) || [];
            const carryValue = carriesAtPosition[level];

            const isCurrentCarryInput =
              isCarryStep && currentStep.position === position && level === carriesAtPosition.length; // следующий уровень для ввода

            if (isCurrentCarryInput) {
              return (
                <div key={`carry-${level}-${i}`} className="w-9 md:w-10 flex justify-center items-center">
                  {renderInputCell(true, true)}
                </div>
              );
            }

            if (carryValue !== undefined) {
              return (
                <div key={`carry-${level}-${i}`} className="w-9 md:w-10 flex justify-center items-center">
                  <span className="text-xs md:text-sm font-bold text-primary/70">{carryValue}</span>
                </div>
              );
            }

            return <div key={`carry-${level}-${i}`} className="w-9 md:w-10" />;
          })}
        </div>,
      );
    }

    return <div className="mb-1">{rows}</div>;
  };

  const renderSumCarries = () => {
    const isSumCarryStep = currentStep?.type === 'sum_carry';
    const hasAnyCarry = sumCarries.size > 0 || isSumCarryStep;

    return (
      <div className="flex justify-end h-6 md:h-7 mb-1">
        {Array.from({ length: maxWidth - totalDigits.length }).map((_, i) => (
          <div key={`sum-carry-pad-${i}`} className="w-9 md:w-10" />
        ))}

        {totalDigits.map((_, i) => {
          const position = totalDigits.length - 1 - i;
          const carryValue = sumCarries.get(`${position}`);
          const isCurrentCarryInput = isSumCarryStep && currentStep.position === position;

          if (isCurrentCarryInput) {
            return (
              <div key={`sum-carry-${i}`} className="w-9 md:w-10 flex justify-center items-center">
                {renderInputCell(true, true)}
              </div>
            );
          }

          if (carryValue !== undefined && carryValue !== null) {
            return (
              <div key={`sum-carry-${i}`} className="w-9 md:w-10 flex justify-center items-center">
                <span className="text-xs md:text-sm font-bold text-primary/70">{carryValue}</span>
              </div>
            );
          }

          return <div key={`sum-carry-${i}`} className="w-9 md:w-10" />;
        })}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl py-4 px-8 md:py-6 md:px-10 shadow-lg border border-border inline-flex w-fit min-h-[248px] sm:min-h-[280px] items-center justify-center">
      <div className="flex flex-col items-end justify-center space-y-1">
        {renderMultiplicationCarries()}

        <div className="flex">
          {Array.from({ length: maxWidth - multiplicandDigits.length }).map((_, i) => (
            <div key={`m-pad-${i}`} className="w-9 md:w-10" />
          ))}
          {multiplicandDigits.map((digit, i) => (
            <div key={`multiplicand-${i}`}>{renderCell(digit)}</div>
          ))}
        </div>

        <div className="flex relative">
          {/* operator does not occupy a grid cell */}
          <div className="absolute -left-3 text-2xl md:text-3xl font-bold text-muted-foreground" style={{ top: '-10px' }}>
            ×
          </div>
          {Array.from({ length: maxWidth - multiplierDigits.length }).map((_, i) => (
            <div key={`mul-pad-${i}`} className="w-9 md:w-10" />
          ))}
          {multiplierDigits.map((digit, i) => (
            <div key={`multiplier-${i}`}>{renderCell(digit)}</div>
          ))}
        </div>

        <div className="h-0.5 bg-foreground my-2" style={{ width: `${maxWidth * 40}px` }} />

        {partialProducts.map((pp, rowIndex) => {
          const rowCells: (number | null | 'input')[] = Array.from({ length: maxWidth }, () => null);
          // pp.digits are stored by position from the right (0 = единицы), so we must map them into columns by "pos from right".
          pp.digits.forEach((digit, posFromRight) => {
            const idx = maxWidth - 1 - pp.offset - posFromRight;
            if (idx >= 0 && idx < rowCells.length) rowCells[idx] = digit ?? null;
          });
          if (currentStep?.type === 'result' && currentStep.row === rowIndex) {
            const idx = maxWidth - 1 - pp.offset - currentStep.position;
            if (idx >= 0 && idx < rowCells.length) rowCells[idx] = 'input';
          }

          return (
            <div key={`partial-${rowIndex}`} className="flex relative">
              {rowIndex > 0 ? (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-2xl md:text-3xl font-bold text-muted-foreground">+</div>
              ) : null}

              {rowCells.map((digit, i) => {
                if (digit === 'input') return <div key={`pp-${rowIndex}-${i}`}>{renderInputCell(true)}</div>;
                return <div key={`pp-${rowIndex}-${i}`}>{renderCell(digit)}</div>;
              })}
            </div>
          );
        })}

        {partialProducts.length > 1 ? (
          <>
            <div className="h-0.5 bg-foreground my-2" style={{ width: `${maxWidth * 40}px` }} />
            {/* Reserve sum-carry row height always in the multi-row section */}
            {renderSumCarries()}
            <div className="flex">
              {Array.from({ length: maxWidth - totalDigits.length }).map((_, i) => (
                <div key={`final-pad-${i}`} className="w-9 md:w-10" />
              ))}
              {totalDigits.map((_digit, i) => {
                const position = totalDigits.length - 1 - i;
                const isCurrentInput = currentStep?.type === 'result' && currentStep.row === -1 && currentStep.position === position;
                const filledValue = finalResult[position];
                return <div key={`final-${i}`}>{isCurrentInput ? renderInputCell(true) : renderCell(filledValue !== undefined ? filledValue : null)}</div>;
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

