import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';
import { renderBasicEmail } from '../../../../lib/mailTemplates';
import { sendMail } from '../../../../lib/mail';

export async function POST(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const oldPassword = typeof body?.oldPassword === 'string' ? body.oldPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  if (!oldPassword || !newPassword || newPassword.length < 6) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { id: true, email: true, passwordHash: true } });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'invalid_old_password' }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  const msg = renderBasicEmail({
    title: 'Пароль изменён — МатТренер',
    previewText: 'Уведомление о смене пароля',
    paragraphs: [
      'Пароль вашего аккаунта был изменён.',
      '',
      `Логин: ${user.email}`,
      `Новый пароль: ${newPassword}`,
      '',
      'Если это были не вы — срочно восстановите доступ через “Забыл пароль” и обратитесь в поддержку.',
    ],
  });
  try {
    await sendMail({ to: user.email, ...msg });
  } catch (err) {
    // Password change should not fail due to email delivery issues.
    // eslint-disable-next-line no-console
    console.error('[auth/change-password] notify send failed:', err);
  }

  return NextResponse.json({ ok: true });
}

