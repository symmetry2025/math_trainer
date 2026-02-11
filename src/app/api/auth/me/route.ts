import { NextResponse } from 'next/server';

import { getCurrentUserOrNull } from '../../../../lib/auth';

export async function GET() {
  const user = await getCurrentUserOrNull();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ user });
}

