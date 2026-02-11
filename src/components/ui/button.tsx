'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

type Variant = 'default' | 'outline' | 'ghost';
type Size = 'default' | 'lg' | 'icon';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'default' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        size === 'icon' && 'h-10 w-10 p-0',
        variant === 'default' && 'btn-primary',
        variant === 'outline' &&
          'h-10 px-4 rounded-2xl border border-input bg-background text-foreground hover:bg-muted/50 transition-colors',
        variant === 'ghost' && 'h-10 w-10 rounded-2xl hover:bg-muted/50 text-foreground',
        className,
      )}
    />
  );
}

