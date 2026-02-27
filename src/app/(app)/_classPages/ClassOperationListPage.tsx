'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Divide, Minus, Plus, X as Times } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ListStatsBar } from '../../../components/ListStatsBar';
import { TopicSection } from '../../../components/TopicSection';
import { additionData, divisionData, multiplicationData, subtractionData } from '../../../data/exerciseData';
import { restoreListReturn, saveListReturn } from '../../../lib/listScrollRestore';
import { emitProgressUpdated } from '../../../lib/stars';
import { exerciseIdToTrainerDbId, hydrateProgressBatchFromDb, wasHydratedRecently } from '../../../lib/progressHydration';
import { cn } from '../../../lib/utils';
import type { Grade, Operation } from './types';
import { exerciseHrefForOp } from './exerciseNavigation';

const opUi: Record<
  Operation,
  {
    title: string;
    subtitle: string;
    icon: any;
    iconClassName: string;
  }
> = {
  addition: {
    title: 'Сложение',
    subtitle: 'Тренируй навыки сложения чисел',
    icon: Plus,
    iconClassName: 'bg-gradient-to-br from-blue-500 to-cyan-500',
  },
  subtraction: {
    title: 'Вычитание',
    subtitle: 'Тренируй навыки вычитания чисел',
    icon: Minus,
    iconClassName: 'bg-gradient-to-br from-orange-500 to-rose-500',
  },
  multiplication: {
    title: 'Умножение',
    subtitle: 'Изучай и тренируй таблицу умножения',
    icon: Times,
    iconClassName: 'bg-gradient-to-br from-primary to-primary/80',
  },
  division: {
    title: 'Деление',
    subtitle: 'Тренируй навыки деления и понимание таблицы деления',
    icon: Divide,
    iconClassName: 'bg-gradient-to-br from-primary to-primary/80',
  },
};

export function ClassOperationListPage(props: { grade: Grade; op: Operation; basePath: string }) {
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    restoreListReturn(props.basePath, { behavior: 'smooth' });
  }, [props.basePath]);

  const gradeData = useMemo(() => {
    const list =
      props.op === 'addition'
        ? additionData
        : props.op === 'subtraction'
          ? subtractionData
          : props.op === 'multiplication'
            ? multiplicationData
            : divisionData;
    return list.find((g) => g.grade === props.grade) ?? null;
  }, [props.op, props.grade]);

  const exerciseIds = useMemo(() => gradeData?.sections.flatMap((s) => s.exercises.map((e) => e.id)) ?? [], [gradeData]);

  useEffect(() => {
    // Hydrate progress for wired exercises once for the whole list page to avoid N+1 requests.
    const trainerDbIds = Array.from(
      new Set(
        (exerciseIds || [])
          .map((id) => exerciseIdToTrainerDbId(id))
          .filter(Boolean) as string[],
      ),
    );
    const toHydrate = trainerDbIds.filter((id) => !wasHydratedRecently(id, 60_000));
    if (!toHydrate.length) return;
    let cancelled = false;
    (async () => {
      await hydrateProgressBatchFromDb(toHydrate);
      if (!cancelled) emitProgressUpdated();
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseIds]);

  const handleExerciseClick = (exerciseId: string) => {
    saveListReturn(props.basePath, exerciseId);
    const href = exerciseHrefForOp({ op: props.op, basePath: props.basePath, exerciseId });
    if (href) {
      router.push(href);
      return;
    }
    console.log('Start exercise (not wired yet):', exerciseId);
  };

  const ui = opUi[props.op];
  const Icon = ui.icon;

  const sections = gradeData?.sections ?? [];
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(0, true);
  }, [emblaApi, props.op, props.grade, sections.length]);

  const planetIdxForSectionIndex = (idx: number) => {
    // Per request: replace 4 -> 7 and 5 -> 6.
    const base = idx + 1;
    if (base === 4) return 7;
    if (base === 5) return 6;
    return Math.max(1, Math.min(7, base));
  };

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div
      className={cn(
        'py-6 px-4 md:py-10 md:px-8',
        // On addition carousel page we want the carousel block vertically centered in viewport
        // (bottom nav height is compensated by shell padding).
        props.op === 'addition' && 'min-h-[calc(100dvh-var(--smmtry-bottom-nav-h,0px))] flex flex-col',
      )}
    >
      <div
        className={cn(
          'max-w-6xl mx-auto w-full flex flex-col gap-8',
          props.op === 'addition' && 'flex-1',
        )}
      >
        <div className="flex items-center gap-4 animate-fade-in">
          <div className={`w-14 h-14 rounded-2xl ${ui.iconClassName} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground truncate text-cartoon-shadow uppercase tracking-wide">
              {ui.title}
            </h1>
            <p className="text-muted-foreground">{ui.subtitle}</p>
          </div>
        </div>

        {/* Temporarily hide stats bar on planet (addition) carousel */}
        {props.op !== 'addition' ? <ListStatsBar exerciseIds={exerciseIds} /> : null}

        {gradeData ? (
          props.op === 'addition' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="space-y-6 w-full">
                {/* Full-bleed carousel (slides disappear beyond screen edges) */}
                <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen mt-10 md:mt-12">
                  <div className="relative h-[360px] md:h-[420px] flex items-center justify-center w-full px-4 md:px-8 lg:px-0">
                    {sections.length ? (
                    <div className="absolute left-1/2 -translate-x-1/2 top-4 md:top-6 z-30">
                        <div className="text-xl md:text-2xl font-extrabold text-foreground text-cartoon-shadow tracking-wide tabular-nums">
                          {`${Math.min(sections.length, selectedIndex + 1)} / ${sections.length}`}
                        </div>
                      </div>
                    ) : null}

                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center">
                    <div className="relative w-full h-full">
                      {/* 
                        Place arrows in the middle of the gap between center slide and side slides.
                        On md the slide basis is ~46% (half = 23%) => center left edge at 27%.
                        On lg the slide basis is ~36% (half = 18%) => center left edge at 32%.
                        gap-6 = 24px, arrow size = 44px => shift by (gap/2 + arrow/2) = 12px + 22px = 34px.
                      */}
                      <button
                        type="button"
                        onClick={scrollPrev}
                        disabled={sections.length < 2 || !emblaApi}
                        className={cn(
                          'pointer-events-auto absolute top-1/2 -translate-y-1/2',
                          'left-4 md:left-[calc(27%-34px)] lg:left-[calc(32%-34px)]',
                          'w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-40',
                          'transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                        )}
                        aria-label="Предыдущая планета"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      <button
                        type="button"
                        onClick={scrollNext}
                        disabled={sections.length < 2 || !emblaApi}
                        className={cn(
                          'pointer-events-auto absolute top-1/2 -translate-y-1/2',
                          'right-4 md:right-[calc(27%-34px)] lg:right-[calc(32%-34px)]',
                          'w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-40',
                          'transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                        )}
                        aria-label="Следующая планета"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                    </div>

                    <div className="w-full overflow-hidden" ref={emblaRef}>
                      <div className="flex items-stretch gap-6">
                      {sections.map((section, idx) => {
                        const planetIdx = planetIdxForSectionIndex(idx);
                        const planetSrc = `/space/galaxies/green/planets/planet-green-${planetIdx}.svg`;
                        const isSelected = idx === selectedIndex;
                        const sizeSeedBase = [84, 96, 110, 90, 102, 86, 116][(planetIdx - 1) % 7] ?? 96;
                        const sizeSeed = Math.round(sizeSeedBase * 1.2);
                        return (
                          <div key={section.id} className="flex-none basis-[100%] md:basis-[46%] lg:basis-[36%] min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (!emblaApi) return;
                                if (isSelected) {
                                  router.push(`${props.basePath}/${encodeURIComponent(section.id)}`);
                                  return;
                                }
                                emblaApi.scrollTo(idx);
                              }}
                              className={cn(
                                'w-full h-[360px] md:h-[420px] flex flex-col items-center justify-center text-center gap-4 bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-3xl px-4',
                                'transition-transform duration-500 ease-out will-change-transform',
                                isSelected ? 'scale-100' : 'scale-[0.78] md:scale-[0.72]',
                              )}
                              aria-label={section.title}
                            >
                              <div
                                className="relative"
                                style={{
                                  width: isSelected
                                    ? `clamp(${Math.max(180, Math.round(sizeSeed * 1.15))}px, 56vw, ${Math.round(sizeSeed * 2.8)}px)`
                                    : `clamp(140px, 26vw, ${Math.round(sizeSeed * 2.0)}px)`,
                                  height: isSelected
                                    ? `clamp(${Math.max(180, Math.round(sizeSeed * 1.15))}px, 56vw, ${Math.round(sizeSeed * 2.8)}px)`
                                    : `clamp(140px, 26vw, ${Math.round(sizeSeed * 2.0)}px)`,
                                }}
                              >
                                <img
                                  src={planetSrc}
                                  alt=""
                                  className="absolute inset-0 h-full w-full object-contain"
                                  loading={isSelected ? 'eager' : 'lazy'}
                                  decoding="async"
                                />
                              </div>
                              <div
                                className={cn(
                                  'text-xl md:text-2xl font-extrabold text-foreground text-cartoon-shadow uppercase tracking-wide',
                                  isSelected ? 'opacity-100' : 'opacity-0',
                                )}
                              >
                                {section.title}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {gradeData.sections.map((section) => (
                <TopicSection key={section.id} title={section.title} exercises={section.exercises} onExerciseClick={handleExerciseClick} />
              ))}
            </div>
          )
        ) : (
          <div className="card-elevated p-6">
            <h2 className="text-xl font-bold text-foreground">Пока пусто</h2>
            <p className="text-muted-foreground mt-2">Для {props.grade} класса в разделе “{ui.title}” пока нет тренажёров.</p>
          </div>
        )}
      </div>
    </div>
  );
}

