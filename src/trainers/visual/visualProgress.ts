export type VisualMentalProgress = {
  'accuracy-choice': boolean;
  'accuracy-input': boolean;
  speed: boolean;
  raceStars: number; // 0..3
};

export function defaultVisualMentalProgress(): VisualMentalProgress {
  return { 'accuracy-choice': false, 'accuracy-input': false, speed: false, raceStars: 0 };
}

function clampStars(v: unknown): 0 | 1 | 2 | 3 {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

export function normalizeVisualMentalProgress(p: any): VisualMentalProgress {
  return {
    'accuracy-choice': !!p?.['accuracy-choice'],
    'accuracy-input': !!p?.['accuracy-input'],
    speed: !!p?.speed,
    raceStars: clampStars(p?.raceStars),
  };
}

