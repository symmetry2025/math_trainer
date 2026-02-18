'use client';

import { useMemo } from 'react';
import { Trophy } from 'lucide-react';

import { CenteredOverlay } from './CenteredOverlay';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SubscriptionActivatedModal(props: {
  open: boolean;
  paidUntil: string | null;
  onClose: () => void;
}) {
  const title = 'Подписка активирована';
  const description = useMemo(() => {
    const until = fmtDate(props.paidUntil ?? null);
    return props.paidUntil ? `Доступ оплачен до: ${until}` : 'Доступ обновлён.';
  }, [props.paidUntil]);

  return (
    <CenteredOverlay open={props.open}>
      <div className={cn('w-full max-w-lg px-4', 'animate-achievement-in')}>
        <div className="card-elevated p-6 md:p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-success/20">
            <Trophy className="w-10 h-10 text-success" />
          </div>

          <div className="space-y-1">
            <div className="text-sm md:text-base font-semibold text-muted-foreground">Оплата прошла успешно</div>
            <div className="text-2xl md:text-3xl font-extrabold text-foreground">{title}</div>
            <div className="text-muted-foreground">{description}</div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={props.onClose} size="lg" className="w-full">
              Хорошо
            </Button>
          </div>
        </div>
      </div>
    </CenteredOverlay>
  );
}

