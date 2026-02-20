'use client';

import { useState } from 'react';

type Role = 'parent' | 'student';

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export default function OnboardingRolePage() {
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(role: Role) {
    setError(null);
    setLoadingRole(role);
    try {
      const res = await fetch('/api/auth/set-role', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ role }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        throw new Error(msg || 'request_failed');
      }
      const redirectTo = isRecord(body) && typeof body.redirectTo === 'string' ? body.redirectTo : '/settings';
      window.location.replace(redirectTo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'unknown_error');
      setLoadingRole(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 md:p-10">
      <div className="card-elevated p-6 md:p-8 max-w-xl w-full space-y-4">
        <div className="space-y-1">
          <div className="text-xl font-bold">Кто вы?</div>
          <div className="text-sm text-muted-foreground">
            Выберите роль. Подписка и оплата будут доступны только в кабинете родителя. Ребёнку мы дадим 7‑дневный пробный период.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            className="card-elevated p-4 text-left hover:shadow-lg transition-shadow disabled:opacity-60"
            disabled={!!loadingRole}
            onClick={() => submit('parent')}
          >
            <div className="font-semibold">Я родитель</div>
            <div className="text-sm text-muted-foreground mt-1">Управляю подпиской, вижу статистику детей</div>
            {loadingRole === 'parent' ? <div className="text-xs text-muted-foreground mt-2">Сохраняем…</div> : null}
          </button>

          <button
            type="button"
            className="card-elevated p-4 text-left hover:shadow-lg transition-shadow disabled:opacity-60"
            disabled={!!loadingRole}
            onClick={() => submit('student')}
          >
            <div className="font-semibold">Я ученик</div>
            <div className="text-sm text-muted-foreground mt-1">Сразу начну тренироваться и привяжусь к родителю</div>
            {loadingRole === 'student' ? <div className="text-xs text-muted-foreground mt-2">Сохраняем…</div> : null}
          </button>
        </div>

        {error ? <div className="text-sm text-destructive">Ошибка: {error}</div> : null}
      </div>
    </div>
  );
}

