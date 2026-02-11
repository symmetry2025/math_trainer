import { Gem, Star } from 'lucide-react';

import { cn } from '../lib/utils';

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
  const isLongTitle = String(props.title || '').trim().length >= 20;
  const baseTotal = Math.max(0, Math.floor(props.crystalsTotal || 0));
  const fallbackTotal = Math.max(0, Math.floor(props.fallbackCrystalsTotal || 0));
  const total = baseTotal > 0 ? baseTotal : !props.unlocked && fallbackTotal > 0 ? fallbackTotal : 0;
  const earned = Math.max(0, Math.floor(props.crystalsEarned || 0));
  const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;
  const isFullyCompleted = total > 0 && earned >= total;
  const raceStars = props.raceStars ?? 0;
  const preRaceDone = !!props.preRaceDone;
  const showMedal = props.unlocked && raceStars > 0;
  const showStars = props.unlocked && (preRaceDone || showMedal);

  // Hover background for "regular" and bronze cards (kept unified for visual consistency).
  // Slightly brighter than before so it doesn't disappear on dark themes.
  const regularHoverBg = 'bg-gradient-to-b from-primary/10 via-primary/4 to-transparent';

  const medalStyle =
    raceStars === 1
      ? { bg: 'from-[#D29148] to-[#A86A2B]' } // bronze
      : raceStars === 2
        ? { bg: 'from-[#E7E7E7] to-[#B9B9B9]' } // silver
        : raceStars >= 3
          ? { bg: 'from-[#FFD666] to-[#D19A00]' } // gold
          : { bg: 'from-primary to-brand' };

  const ordinalText = String(Math.max(1, Math.floor(Number(props.ordinal || 1))));
  const ordinalColor = !props.unlocked
    ? 'text-muted-foreground/70'
    : showMedal
    ? raceStars === 2
      ? 'text-slate-800/55'
      : 'text-white/65'
    : 'text-primary-foreground/65';

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.unlocked}
      data-exercise-id={props.exerciseId}
      className={cn(
        'group relative overflow-hidden flex flex-col items-center text-center p-3 md:p-4 rounded-2xl transition-all duration-300 cursor-pointer',
        !props.unlocked && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-2xl transition-all duration-300 opacity-0 group-hover:opacity-100 z-0',
          props.unlocked &&
            (showMedal
              ? raceStars >= 3
                ? 'bg-gradient-to-b from-yellow-400/25 via-yellow-400/10 to-transparent'
                : raceStars === 2
                  ? 'bg-gradient-to-b from-slate-300/30 via-slate-300/12 to-transparent'
                  : regularHoverBg
              : regularHoverBg),
        )}
      />

      <div className="relative z-10">
        <div
          className={cn(
            'relative w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full p-1 transition-transform duration-300 transform-gpu will-change-transform origin-center',
            props.unlocked && earned > 0 ? 'bg-muted' : 'bg-transparent',
            props.unlocked && 'group-hover:scale-105 drop-shadow-sm group-hover:drop-shadow-md',
          )}
          style={
            props.unlocked && earned > 0 && total > 0
              ? {
                  background: `conic-gradient(
                    hsl(var(--accent)) ${percentage * 3.6}deg,
                    hsl(var(--muted)) ${percentage * 3.6}deg
                  )`,
                  borderRadius: '9999px',
                }
              : undefined
          }
        >
          <div
            className={cn(
              'relative w-full h-full rounded-full flex flex-col items-center justify-center transition-all duration-300 overflow-hidden',
              !props.unlocked && 'bg-muted/80 border-2 border-dashed border-muted-foreground/30',
              props.unlocked &&
                (showMedal
                  ? `bg-gradient-to-br ${medalStyle.bg} shadow-xl group-hover:shadow-2xl`
                  : 'bg-gradient-to-br from-primary to-brand shadow-lg group-hover:shadow-xl group-hover:shadow-primary/30'),
            )}
          >
            <span
              className={cn(
                'tabular-nums font-extrabold leading-none select-none',
                'text-3xl md:text-4xl',
                ordinalColor,
              )}
            >
              {ordinalText}
            </span>

            {showStars ? (
              <div className="absolute inset-0 pointer-events-none">
                {([1, 2, 3] as const).map((i) => {
                  const active = showMedal && raceStars >= i;
                  // Arrange stars around the number (slight arc), similar to the provided mock:
                  // left-bottom, bottom-center, right-bottom relative to center.
                  const pos =
                    i === 1
                      ? { x: -18, y: 14 }
                      : i === 2
                        ? { x: 0, y: 22 }
                        : { x: 18, y: 14 };
                  const inactiveColor = showMedal ? 'text-white/30' : 'text-primary-foreground/35';
                  return (
                    <Star
                      key={i}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        // Anchor by star center to keep it aligned around the number.
                        transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
                      }}
                      className={cn(
                        'w-3.5 h-3.5 md:w-4 md:h-4',
                        active ? 'text-[#FFD666] fill-current drop-shadow-sm' : inactiveColor,
                      )}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Fixed vertical rhythm: title (2 lines) → description (2 lines) → crystals (1 line) */}
      <h4
        className={cn(
          // Make long Russian titles fit in exactly 2 lines without breaking words.
          isLongTitle
        ? 'text-[11px] sm:text-[11px] md:text-[13px] font-medium leading-snug tracking-tight'
        : 'text-[12px] sm:text-[12px] md:text-sm font-semibold leading-snug tracking-tight',
          'text-foreground',
          'mt-3 w-full px-1 whitespace-normal break-normal hyphens-none',
      'line-clamp-2 md:min-h-[2.5rem]',
        )}
      >
        {props.title}
      </h4>

  <p className="relative z-10 text-[11px] md:text-xs text-muted-foreground mt-0.5 w-full px-1 whitespace-normal break-normal hyphens-none line-clamp-2 md:min-h-[2.2rem]">
        {props.description ? props.description : '\u00A0'}
      </p>

      <div
        className={cn(
          'relative z-10 mt-0.5 inline-flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground min-h-[1.25rem]',
          total > 0 ? '' : 'invisible',
        )}
      >
        <Gem className="w-[10px] h-[10px] md:w-3 md:h-3 text-muted-foreground" />
        <span className="tabular-nums text-muted-foreground">{earned}</span>
        <span className="text-muted-foreground/70">/</span>
        <span className="tabular-nums text-muted-foreground">{total}</span>
      </div>
    </button>
  );
}

