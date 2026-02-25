'use client';

import { Phone, Send, X } from 'lucide-react';

import { CenteredOverlay } from './CenteredOverlay';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function SupportModal(props: { open: boolean; onClose: () => void }) {
  const phoneRaw = '+79017173385';
  const phonePretty = '+7 (901) 717-33-85';
  const tgUsername = 'symmetry_admin';
  const tgHref = `https://t.me/${encodeURIComponent(tgUsername)}`;

  return (
    <CenteredOverlay open={props.open}>
      <div className={cn('w-full max-w-lg px-4', 'animate-achievement-in')}>
        <div className="card-elevated p-6 md:p-8 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-extrabold text-foreground">Поддержка</div>
              <div className="text-sm text-muted-foreground">Выбери удобный способ связи</div>
            </div>
            <button
              type="button"
              className="h-10 w-10 rounded-2xl border border-input bg-background hover:bg-muted transition-colors flex items-center justify-center"
              onClick={props.onClose}
              aria-label="Закрыть"
              title="Закрыть"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-foreground">Телефон</div>
                <a className="text-sm text-primary hover:underline" href={`tel:${phoneRaw}`}>
                  {phonePretty}
                </a>
              </div>
              <a className="shrink-0" href={`tel:${phoneRaw}`}>
                <Button type="button" className="whitespace-nowrap">
                  <Phone className="w-4 h-4" />
                  Позвонить
                </Button>
              </a>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/40 p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-foreground">Telegram</div>
                <a className="text-sm text-primary hover:underline" href={tgHref} target="_blank" rel="noreferrer">
                  @{tgUsername}
                </a>
              </div>
              <a className="shrink-0" href={tgHref} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" className="whitespace-nowrap">
                  <Send className="w-4 h-4" />
                  Написать
                </Button>
              </a>
            </div>
          </div>

          <div className="pt-1">
            <Button type="button" variant="outline" className="w-full" onClick={props.onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    </CenteredOverlay>
  );
}

