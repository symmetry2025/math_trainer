import { NextResponse } from 'next/server';

import { getCurrentUserOrNull } from '../../../../../lib/auth';
import { getTrainerProgress } from '../../../../../lib/trainerProgress';

export async function GET(_req: Request, ctx: { params: { trainerId: string } }) {
  const user = await getCurrentUserOrNull();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const trainerId = String(ctx?.params?.trainerId || '').trim();
  if (!trainerId) return NextResponse.json({ error: 'invalid_trainer' }, { status: 400 });

  const progress = await getTrainerProgress(user.id, trainerId);
  return NextResponse.json({ trainerId, progress });
}

