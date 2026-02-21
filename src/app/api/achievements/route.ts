import { NextResponse } from 'next/server';

import { AchievementsResponseDtoSchema } from '@smmtry/shared';

import { getCurrentUserOrNull } from '../../../lib/auth';
import { prisma } from '../../../lib/db';
import { ACHIEVEMENT_CATALOG } from '../../../lib/achievements';

function asInt(x: unknown, def = 0) {
  const n = typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : def;
}

export async function GET(req: Request) {
  const user = await getCurrentUserOrNull();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const childId = (url.searchParams.get('childId') || '').trim();
  const role = String(user.role || '').trim();
  let targetUserId = user.id;
  if (childId) {
    if (role === 'admin') {
      targetUserId = childId;
    } else if (role === 'parent') {
      const link = await prisma.parentStudentLink.findUnique({ where: { studentId: childId }, select: { parentId: true } });
      if (!link || link.parentId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      targetUserId = childId;
    } else {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  } else if (role === 'parent') {
    const first = await prisma.parentStudentLink.findFirst({
      where: { parentId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { studentId: true },
    });
    if (!first?.studentId) return NextResponse.json({ error: 'no_children' }, { status: 404 });
    targetUserId = first.studentId;
  }

  const rows = await prisma.userAchievement.findMany({
    where: { userId: targetUserId },
    select: { achievementId: true, progress: true, unlockedAt: true },
  });
  const byId: Record<string, { progress: any; unlockedAt: Date | null }> = {};
  for (const r of rows) byId[r.achievementId] = { progress: r.progress as any, unlockedAt: r.unlockedAt ?? null };

  const achievements = ACHIEVEMENT_CATALOG.map((def) => {
    const row = byId[def.id];
    const unlockedAtIso = row?.unlockedAt ? row.unlockedAt.toISOString() : null;

    if (def.kind === 'counter') {
      const total = Math.max(0, asInt(def.total, 0));
      const currentRaw = row?.progress?.current;
      const current = Math.max(0, Math.min(total || Number.MAX_SAFE_INTEGER, asInt(currentRaw, 0)));
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        iconKey: def.iconKey,
        kind: 'counter' as const,
        total,
        progress: current,
        unlockedAt: unlockedAtIso,
      };
    }

    // boolean
    const unlocked = !!unlockedAtIso;
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      iconKey: def.iconKey,
      kind: 'boolean' as const,
      total: 1,
      progress: unlocked ? 1 : 0,
      unlockedAt: unlockedAtIso,
    };
  });

  const payload = { achievements };
  // ensure runtime response matches shared DTO
  const parsed = AchievementsResponseDtoSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_state' }, { status: 500 });

  return NextResponse.json(parsed.data);
}

