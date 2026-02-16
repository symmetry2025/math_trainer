import {
  ChevronRight,
  Divide,
  Gem,
  Grid2x2,
  Hash,
  Lock,
  Minus,
  Plus,
  Puzzle,
  Sigma,
  Table2,
  X as Times,
  Columns3,
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

function getExerciseIcon(id: string) {
  // Visual
  if (id.startsWith('compose')) return Puzzle;
  if (id.includes('sumtable')) return Table2;
  if (id.startsWith('add-table-') || id.includes('tablefill')) return Grid2x2;

  // Column
  if (id.startsWith('column-')) return Columns3;

  // Equations
  if (id.startsWith('add-missing-') || id.startsWith('sub-missing-')) return Sigma;

  // Mental arithmetic
  if (id.startsWith('mul-table-') || id.startsWith('mul-')) return Times;
  if (id.startsWith('div-')) return Divide;
  if (id.startsWith('sub-')) return Minus;
  if (id.startsWith('add-')) return Plus;

  return Hash;
}

export function ExerciseCard(props: {
  exerciseId: string;
  ordinal: number;
  title: string;
  description?: string;
  unlocked: boolean;
  crystalsEarned: number;
  crystalsTotal: number;
  /** Optional fallback for locked/unwired exercises so the layout stays uniform (e.g. 100). */
  fallbackCrystalsTotal?: number;
  preRaceDone: boolean;
  raceStars: 0 | 1 | 2 | 3;
  onClick?: () => void;
}) {
  const baseTotal = Math.max(0, Math.floor(props.crystalsTotal || 0));
  const fallbackTotal = Math.max(0, Math.floor(props.fallbackCrystalsTotal || 0));
  const total = baseTotal > 0 ? baseTotal : !props.unlocked && fallbackTotal > 0 ? fallbackTotal : 0;
  const earned = Math.max(0, Math.floor(props.crystalsEarned || 0));
  const raceStars = props.raceStars ?? 0;
  const tier = tierConfig[raceStars];
  const Icon = getExerciseIcon(props.exerciseId);

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
      {/* Stars sticker */}
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
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl text-2xl shrink-0 transition-transform duration-200 group-hover:scale-110',
            props.unlocked && raceStars > 0 ? `bg-gradient-to-br ${tier.gradient} shadow-md` : 'bg-primary/10',
          )}
          aria-hidden="true"
        >
          {props.unlocked ? <Icon className="w-6 h-6 text-foreground/80" /> : <Lock className="w-5 h-5 text-muted-foreground/70" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn('flex flex-col', props.description ? 'justify-start' : 'justify-center', 'min-h-[2.75rem]')}>
            <div className="font-semibold text-foreground text-[15px] md:text-base leading-tight line-clamp-1">{props.title}</div>
            {props.description ? <div className="text-sm text-muted-foreground mt-0.5 leading-tight line-clamp-1">{props.description}</div> : null}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums',
              total > 0 ? 'text-foreground' : 'invisible',
            )}
          >
            <Gem className="w-4 h-4 text-muted-foreground" />
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

