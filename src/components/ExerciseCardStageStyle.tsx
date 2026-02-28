import {
  ChevronRight,
  Lock,
  Star,
} from 'lucide-react';

import { cn } from '../lib/utils';

const tierConfig: Record<
  0 | 1 | 2 | 3,
  {
    card: string;
    gradient: string;
  }
> = {
  0: {
    card: 'bg-white dark:bg-card border-border/40 hover:border-primary',
    gradient: '',
  },
  1: {
    card: 'bg-gradient-to-r from-[#F6E2D1] to-[#FFF7ED] border-[#E5BFA7]/70 hover:border-[#E5BFA7]',
    gradient: 'from-amber-500 to-orange-400',
  },
  2: {
    card: 'bg-gradient-to-r from-[#EEF2F7] to-[#F8FAFC] border-[#CBD5E1]/70 hover:border-[#CBD5E1]',
    gradient: 'from-slate-400 to-blue-300',
  },
  3: {
    card: 'bg-gradient-to-r from-[#FEF3C7] to-[#FFFBEB] border-[#FCD34D]/70 hover:border-[#FCD34D]',
    gradient: 'from-yellow-400 to-amber-300',
  },
};

export function ExerciseCardStageStyle(props: {
  exerciseId: string;
  ordinal: number;
  title: string;
  description?: string;
  unlocked: boolean;
  starsEarned: number;
  starsTotal: number;
  /** Optional fallback for locked/unwired exercises so the layout stays uniform (e.g. 6). */
  fallbackStarsTotal?: number;
  preRaceDone: boolean;
  raceStars: 0 | 1 | 2 | 3;
  onClick?: () => void;
}) {
  const baseTotal = Math.max(0, Math.floor(props.starsTotal || 0));
  const fallbackTotal = Math.max(0, Math.floor(props.fallbackStarsTotal || 0));
  const total = baseTotal > 0 ? baseTotal : !props.unlocked && fallbackTotal > 0 ? fallbackTotal : 0;
  const earned = Math.max(0, Math.floor(props.starsEarned || 0));
  const raceStars = props.raceStars ?? 0;
  const tier = tierConfig[raceStars];
  const ordinalText = String(Math.max(1, Math.floor(Number(props.ordinal || 1))));

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.unlocked}
      data-exercise-id={props.exerciseId}
      className={cn(
        'group relative w-full text-left rounded-2xl border-2 transition-colors duration-200',
        props.unlocked ? 'hover:shadow-sm hover:brightness-[0.985]' : 'opacity-55 cursor-not-allowed',
        tier.card,
      )}
    >
      {/* Star sticker */}
      {props.unlocked && raceStars > 0 ? (
        <div className="absolute -top-3 -right-2 z-10 flex items-center gap-0.5 bg-white/95 dark:bg-card rounded-full px-2 py-1 shadow-md border border-border/30 rotate-3 group-hover:rotate-6 transition-transform duration-300">
          {[1, 2, 3].map((i) => (
            <Star
              key={i}
              className={cn(
                'w-4 h-4 transition-all duration-300',
                i <= raceStars ? 'text-accent fill-accent drop-shadow-sm' : 'text-muted-foreground/40 fill-muted',
              )}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-3 px-4 py-4">
        {/* Ordinal (square) */}
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105',
            props.unlocked && raceStars > 0 ? `bg-gradient-to-br ${tier.gradient} shadow-sm` : 'bg-primary/10',
          )}
          aria-hidden="true"
        >
          {props.unlocked ? (
            <span className="tabular-nums font-extrabold text-xl text-foreground/85">{ordinalText}</span>
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground/70" />
          )}
        </div>

        {/* Text (fixed height; centers title when no description) */}
        <div className="flex-1 min-w-0">
          <div className={cn('flex flex-col min-h-[2.75rem]', props.description ? 'justify-start' : 'justify-center')}>
            <div className="font-semibold text-foreground text-[15px] md:text-base leading-tight whitespace-normal break-words line-clamp-2 md:line-clamp-1">
              {props.title}
            </div>
            {props.description ? <div className="text-sm text-muted-foreground mt-0.5 leading-tight line-clamp-1">{props.description}</div> : null}
          </div>
        </div>

        {/* Right side: stars progress + arrow */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={cn('inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums', total > 0 ? 'text-foreground' : 'invisible')}>
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span>{earned}</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-muted-foreground">{total}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
      </div>
    </button>
  );
}

