import { NextResponse } from 'next/server';

import { getCurrentUserOrNull } from '../../../../lib/auth';
import { getTrainerProgressMany } from '../../../../lib/trainerProgress';

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export async function POST(req: Request) {
  const user = await getCurrentUserOrNull();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const rawIds = isRecord(body) && Array.isArray(body.trainerIds) ? body.trainerIds : null;
  if (!rawIds) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const trainerIds = Array.from(new Set(rawIds.map((x) => String(x || '').trim()).filter(Boolean)));
  if (!trainerIds.length) return NextResponse.json({ trainerIds: [], progressByTrainerId: {} });
  if (trainerIds.length > 200) return NextResponse.json({ error: 'too_many_ids' }, { status: 400 });

  const progressByTrainerId = await getTrainerProgressMany(user.id, trainerIds);
  return NextResponse.json({ trainerIds, progressByTrainerId });
}

