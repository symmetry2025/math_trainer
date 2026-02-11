'use client';

import { Delete } from 'lucide-react';

import { cn } from '../lib/utils';

export interface NumberKeyboardProps {
  onInput: (value: number) => void;
  onBackspace?: () => void;
  disabled?: boolean;
  showBackspace?: boolean;
}

export default function NumberKeyboard({ onInput, onBackspace, disabled, showBackspace }: NumberKeyboardProps) {
  const withBackspace = !!showBackspace && typeof onBackspace === 'function';
  const numbers: Array<Array<number | 'backspace' | null>> = [
    [7, 8, 9],
    [4, 5, 6],
    [1, 2, 3],
    [withBackspace ? 'backspace' : null, 0, 0],
  ];

  return (
    <div className="inline-grid w-fit mx-auto gap-2 grid-cols-[repeat(3,3.5rem)] sm:grid-cols-[repeat(3,4rem)]">
      {numbers.flat().map((num, index) => {
        // Keep keyboard height canonical: 56px on base, 64px on sm+ (matches card height).
        // Make cells square so the grid pitch is equal on X/Y.
        if (num === null) return <div key={`empty-${index}`} className="w-14 h-14 sm:w-16 sm:h-16" />;

        if (num === 'backspace') {
          return (
            <button
              key="backspace"
              type="button"
              onClick={onBackspace}
              onMouseDown={(e) => e.currentTarget.classList.add('scale-95')}
              onMouseUp={(e) => e.currentTarget.classList.remove('scale-95')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('scale-95')}
              onTouchStart={(e) => e.currentTarget.classList.add('scale-95')}
              onTouchEnd={(e) => e.currentTarget.classList.remove('scale-95')}
              disabled={disabled}
              className={cn(
                'w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center select-none',
                'bg-muted border-2 border-border',
                'hover:bg-accent hover:border-primary/50',
                'transition-transform duration-100',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                'active:scale-95',
              )}
              aria-label="Удалить"
            >
              <Delete className="w-6 h-6 text-muted-foreground" />
            </button>
          );
        }

        // Make the bottom-row "0" span 2 cells (right side), keeping Backspace at bottom-left.
        const isZeroSpan = num === 0 && index === 10;
        if (isZeroSpan) {
          return (
            <button
              key="0-span"
              type="button"
              onClick={() => onInput(0)}
              onMouseDown={(e) => e.currentTarget.classList.add('scale-95')}
              onMouseUp={(e) => e.currentTarget.classList.remove('scale-95')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('scale-95')}
              onTouchStart={(e) => e.currentTarget.classList.add('scale-95')}
              onTouchEnd={(e) => e.currentTarget.classList.remove('scale-95')}
              disabled={disabled}
              className={cn(
                'col-span-2 w-[7.5rem] sm:w-[8.5rem] h-14 sm:h-16 rounded-xl text-2xl sm:text-3xl font-bold select-none',
                'bg-card border-2 border-border',
                'hover:bg-accent hover:border-primary/50',
                'transition-transform duration-100',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                'active:scale-95',
              )}
            >
              0
            </button>
          );
        }

        // Hide the duplicated placeholder cell for the spanned "0".
        if (num === 0 && index === 11) {
          return <div key="0-span-placeholder" className="hidden" />;
        }

        return (
          <button
            key={num}
            type="button"
            onClick={() => onInput(num)}
            onMouseDown={(e) => e.currentTarget.classList.add('scale-95')}
            onMouseUp={(e) => e.currentTarget.classList.remove('scale-95')}
            onMouseLeave={(e) => e.currentTarget.classList.remove('scale-95')}
            onTouchStart={(e) => e.currentTarget.classList.add('scale-95')}
            onTouchEnd={(e) => e.currentTarget.classList.remove('scale-95')}
            disabled={disabled}
            className={cn(
              'w-14 h-14 sm:w-16 sm:h-16 rounded-xl text-2xl sm:text-3xl font-bold select-none',
              'bg-card border-2 border-border',
              'hover:bg-accent hover:border-primary/50',
              'transition-transform duration-100',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              'active:scale-95',
            )}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

