'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { cn } from '../../../lib/utils';
import { playCorrectSfx, playWrongSfx } from '../../../lib/sfx';
import { AnimatedHint } from '../../../components/AnimatedHint';
import { DrillFeedbackTooltip } from './DrillFeedbackTooltip';
import type { DrillAnswerStatus } from './types';

export function DrillStage(props: {
  /** Card */
  card: ReactNode;
  /** Right-side input (options/keyboard/table) */
  input: ReactNode;
  /** Optional hint between card and input (keeps a reserved space even when empty) */
  hintText?: string;
  /** Answer feedback tooltip status */
  status: DrillAnswerStatus;
  /** Card animation classes */
  cardKey: number;
  cardAnimating: boolean;
  /**
   * Layout mode:
   * - 'column' (default): card → hint → input (stacked)
   * - 'rowOnDesktop': on lg+ card on the left, hint+input on the right
   */
  layout?: 'column' | 'rowOnDesktop';
  /**
   * Optional width constraints for the card wrapper.
   * Default: `max-w-xl` (keeps most cards compact).
   */
  cardWrapperClassName?: string;
  /**
   * Optional wrapper for the input area.
   * Default: `w-fit` (keeps keyboard sized to its content).
   */
  inputWrapperClassName?: string;
}) {
  const prevStatusRef = useRef<DrillAnswerStatus>(null);
  useEffect(() => {
    if (!props.status) {
      prevStatusRef.current = props.status;
      return;
    }
    if (props.status === prevStatusRef.current) return;
    if (props.status === 'correct') playCorrectSfx();
    if (props.status === 'wrong') playWrongSfx();
    prevStatusRef.current = props.status;
  }, [props.status]);

  return (
    <div className="mx-auto w-full">
      {props.layout === 'rowOnDesktop' ? (
        <div className="flex flex-col items-center justify-center gap-5 md:gap-6 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
          <div className="w-full flex justify-center lg:w-auto">
            <div className={cn('w-full', props.cardWrapperClassName ?? 'max-w-xl')}>
              <div className="relative">
                <div
                  key={props.cardKey}
                  className={cn(
                    // Keep card height canonical vs number keyboard:
                    // base: 4*56 + 3*8 = 248px; sm+: 4*64 + 3*8 = 280px
                    'card-elevated p-6 md:p-8 min-h-[248px] sm:min-h-[280px] flex items-center justify-center',
                    props.cardAnimating ? 'animate-card-exit' : 'animate-card-enter',
                  )}
                >
                  {props.card}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full flex justify-center lg:w-auto">
            <div className={props.inputWrapperClassName ?? 'w-fit'}>
              {/* Hint spacer near the input (reserves height, no layout shifts) */}
              <div className="h-10 md:h-12 flex items-center justify-center text-base md:text-lg font-medium text-muted-foreground text-center">
                {props.status ? (
                  <DrillFeedbackTooltip status={props.status} placement="inline" />
                ) : (
                  <AnimatedHint text={props.hintText || ''} className="text-muted-foreground" />
                )}
              </div>

              <div className="mt-3 flex justify-center">{props.input}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-5 md:gap-6">
          <div className="w-full flex justify-center">
            <div className={cn('w-full', props.cardWrapperClassName ?? 'max-w-xl')}>
              <div className="relative">
                <div
                  key={props.cardKey}
                  className={cn(
                    // Keep card height canonical vs number keyboard:
                    // base: 4*56 + 3*8 = 248px; sm+: 4*64 + 3*8 = 280px
                    'card-elevated p-6 md:p-8 min-h-[248px] sm:min-h-[280px] flex items-center justify-center',
                    props.cardAnimating ? 'animate-card-exit' : 'animate-card-enter',
                  )}
                >
                  {props.card}
                </div>
              </div>
            </div>
          </div>

          {/* Hint spacer between card and input (always reserves some air) */}
          <div className="h-10 md:h-12 flex items-center justify-center text-base md:text-lg font-medium text-muted-foreground text-center">
            {props.status ? (
              <DrillFeedbackTooltip status={props.status} placement="inline" />
            ) : (
              <AnimatedHint text={props.hintText || ''} className="text-muted-foreground" />
            )}
          </div>

          <div className="w-full flex justify-center">
            <div className={props.inputWrapperClassName ?? 'w-fit'}>{props.input}</div>
          </div>
        </div>
      )}
    </div>
  );
}

