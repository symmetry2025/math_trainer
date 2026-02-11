'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} className={cn('card-elevated', className)} />;
}

export function CardContent(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} className={cn(className)} />;
}

