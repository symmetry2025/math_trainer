import { NextResponse } from 'next/server';

import { prisma } from '../../../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../../../lib/auth';

function normalizeId(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (s.length > 64) return '';
  return s;
}

function seatHasAccessNow(seat: { status: string; paidUntil: Date | null }): boolean {
  const now = Date.now();
  const paidMs = seat.paidUntil ? seat.paidUntil.getTime() : 0;
  if (Number.isFinite(paidMs) && paidMs > now) return true;
  if (seat.status === 'active' && !seat.paidUntil) return true;
  return false;
}

export async function POST(req: Request, ctx: { params: { seatId: string } }) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'parent' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (me.role !== 'admin' && !me.emailVerifiedAt) return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });

  const seatId = normalizeId(ctx?.params?.seatId);
  if (!seatId) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const studentId = normalizeId(body?.studentId);
  if (!studentId) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const seat = await prisma.subscriptionSeat.findUnique({
    where: { id: seatId },
    select: { id: true, parentId: true, status: true, paidUntil: true, assignedStudentId: true },
  });
  if (!seat) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (me.role !== 'admin' && seat.parentId !== me.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (seat.assignedStudentId && seat.assignedStudentId !== studentId) return NextResponse.json({ error: 'seat_already_assigned' }, { status: 409 });
  if (!seatHasAccessNow(seat)) return NextResponse.json({ error: 'seat_not_active' }, { status: 409 });

  // Verify child belongs to this parent.
  if (me.role !== 'admin') {
    const link = await prisma.parentStudentLink.findUnique({ where: { studentId }, select: { parentId: true } });
    if (!link || link.parentId !== me.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, role: true } });
  if (!student) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (student.role !== 'student' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const now = new Date();
  try {
    await prisma.subscriptionSeat.update({
      where: { id: seat.id },
      data: { assignedStudentId: student.id, assignedAt: now },
      select: { id: true },
    });
  } catch {
    // Unique constraint on assignedStudentId.
    return NextResponse.json({ error: 'student_already_assigned' }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

