'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createTicketAction } from '@/app/painel/actions';
import { formatBRL } from '@/lib/domain/money';

export interface UpsellPlan {
  name: string;
  priceCents: number;
  claimLimit: number;
  claimsUnlimited: boolean;
  priorityDelaySeconds: number;
  maxRegions: number | null;
  allPlanFilters: boolean;
}

interface Props {
  premium: UpsellPlan;
  current: UpsellPlan | null;
  urgency: number;
  leadLabel: string;
}

function minutes(s: number) {
  return s % 60 === 0 ? `${s / 60} min` : `${s} s`;
}

/** Botão "Reivindicar" de um lead exclusivo do Premium: abre a oferta de upgrade. */
export function PremiumUpsellButton({ premium, current, urgency, leadLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const advantages: Array<{ title: string; detail?: string }> = [
    { title: 'Leads sem limite por ciclo', detail: current && !current.claimsUnlimited ? `hoje: até ${current.claimLimit} por ciclo` : undefined },
    { title: 'Exclusividade nos leads mais urgentes (8 a 10)', detail: 'como este — só o Premium recebe' },
    {
      title: 'Acesso no momento em que o lead é publicado',
      detail: current && current.priorityDelaySeconds > 0 ? `hoje: ${minutes(current.priorityDelaySeconds)} depois` : undefined,
    },
    { title: 'Múltiplas cidades ou regiões', detail: current?.maxRegions != null ? `hoje: até ${current.maxRegions}` : undefined },
    { title: 'Todos os filtros: crédito, parcela, prazo, região e administradora', detail: current && !current.allPlanFilters ? 'hoje: filtros parciais' : undefined },
    { title: 'Relatórios avançados e suporte prioritário' },
  ];

  function requestUpgrade() {
    const fd = new FormData();
    fd.set('kind', 'billing');
    fd.set('subject', `Upgrade para o plano ${premium.name}`);
    fd.set(
      'message',
      `Quero mudar ${current ? `do plano ${current.name} ` : ''}para o plano ${premium.name} (${formatBRL(premium.priceCents, { cents: false })}/mês). ` +
        `Pedido feito a partir de um lead urgente (urgência ${urgency}/10): ${leadLabel}.`,
    );
    start(async () => setResult(await createTicketAction({}, fd)));
  }

  return (
    <>
      <div className="text-right">
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setOpen(true);
          }}
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          🔒 Reivindicar
        </button>
        <p className="mt-1 max-w-56 text-xs text-muted">Exclusivo do {premium.name}</p>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-4 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upsell-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="relative rounded-t-2xl bg-gradient-to-br from-navy-900 to-navy-700 px-6 pb-6 pt-5 text-white">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
                Urgência {urgency}/10
              </span>
              <h2 id="upsell-title" className="mt-3 text-2xl font-extrabold leading-tight !text-white">
                Este lead é exclusivo do plano {premium.name}
              </h2>
              <p className="mt-2 text-sm text-white/85">
                {leadLabel}. Quem informou urgência de 8 a 10 quer contratar logo — e esses pedidos vão só para assinantes {premium.name}.
              </p>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-navy-900">O que você ganha no {premium.name}</p>
              <ul className="mt-3 space-y-2.5">
                {advantages.map((a) => (
                  <li key={a.title} className="flex gap-2.5 text-sm">
                    <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-green-soft text-xs font-bold text-brand-green-dark">✓</span>
                    <span>
                      <span className="font-medium text-navy-900">{a.title}</span>
                      {a.detail && <span className="block text-xs text-muted">{a.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-xl border border-brand-green/40 bg-brand-green-soft px-4 py-3">
                <p className="text-sm text-navy-900">
                  <span className="font-display text-2xl font-extrabold">{formatBRL(premium.priceCents, { cents: false })}</span>
                  <span className="text-muted">/mês</span>
                </p>
                <p className="text-xs text-navy-900">Mesmo valor do plano {premium.name}, sem taxa de troca. Sem garantia de volume de leads.</p>
              </div>

              {result?.ok ? (
                <div role="status" className="mt-5 rounded-xl border border-brand-green/30 bg-white p-4 text-sm text-navy-900">
                  <p className="font-semibold">Pedido de troca enviado!</p>
                  <p className="mt-1">
                    Nossa equipe confirma a mudança para o {premium.name} e responde em{' '}
                    <Link href="/painel/suporte" className="font-semibold underline">Suporte</Link> e por e-mail. Se o lead ainda estiver disponível
                    depois da troca, ele aparece para você reivindicar.
                  </p>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={requestUpgrade}
                    className="flex-1 rounded-lg bg-brand-green px-4 py-3 font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60"
                  >
                    {pending ? 'Enviando…' : `Quero o ${premium.name}`}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-3 text-sm font-semibold text-navy-900 hover:bg-navy-50">
                    Agora não
                  </button>
                </div>
              )}
              {result?.error && <p role="alert" className="mt-2 text-sm text-danger">{result.error}</p>}
              <p className="mt-3 text-center text-xs text-muted">
                <Link href="/painel/assinatura" className="underline">Comparar todos os planos</Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
