import Link from 'next/link';
import { ClaimButton } from '@/components/panel/claim-button';
import { Alert, Badge, Card, EmptyState, PageTitle, formatDateTime } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';
import { formatRange } from '@/lib/domain/money';
import { PremiumUpsellButton, type UpsellPlan } from '@/components/panel/premium-upsell';
import { getPlans, type PublicPlan } from '@/lib/server/queries';

interface AvailableLead {
  lead_id: string;
  modality_name: string;
  city: string;
  state: string;
  credit_min_cents: number | null;
  credit_max_cents: number | null;
  installment_min_cents: number | null;
  installment_max_cents: number | null;
  term_months: number | null;
  administrator_name: string | null;
  quality_tier: string | null;
  published_at: string;
  available_until: string;
  is_redistribution: boolean;
  urgency: number | null;
}

interface LockedLead {
  lead_id: string;
  modality_name: string;
  city: string;
  state: string;
  credit_min_cents: number | null;
  credit_max_cents: number | null;
  term_months: number | null;
  urgency: number;
  published_at: string;
}

function toUpsell(p: PublicPlan): UpsellPlan {
  return {
    name: p.name,
    priceCents: p.priceCents,
    claimLimit: p.claimLimit,
    claimsUnlimited: p.claimsUnlimited,
    priorityDelaySeconds: p.priorityDelaySeconds,
    maxRegions: p.maxRegions,
    allPlanFilters: p.allowedFilters.length >= 5,
  };
}

export default async function NovosLeadsPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { lead: highlighted } = await searchParams;
  const { supabase } = await requireConsultant();
  const [{ data: usage }, { data, error }, { data: lockedData }, plans] = await Promise.all([
    supabase.rpc('consultant_usage'),
    supabase.rpc('list_available_leads', { p_limit: 100 }),
    supabase.rpc('list_locked_urgent_leads', { p_limit: 20 }),
    getPlans(),
  ]);
  const u = (usage ?? {}) as { active?: boolean; remaining?: number | null; unlimited?: boolean; plan_code?: string };
  const topPlan = [...plans].sort((a, b) => b.maxLeadUrgency - a.maxLeadUrgency || b.priceCents - a.priceCents)[0];
  const currentPlan = plans.find((p) => p.code === u.plan_code) ?? null;
  const locked = topPlan && u.plan_code !== topPlan.code ? ((lockedData ?? []) as LockedLead[]) : [];
  const leads = (data ?? []) as AvailableLead[];
  const noBalance = u.active && !u.unlimited && (u.remaining ?? 0) <= 0;

  return (
    <>
      <PageTitle title="Novos leads" description="Resumo das oportunidades compatíveis. O contato é liberado somente para quem concluir a reivindicação." />
      {!u.active && <Alert tone="warn" className="mb-4">Ative um plano para ver e reivindicar oportunidades. <Link className="underline" href="/painel/assinatura">Plano e assinatura</Link></Alert>}
      {noBalance && <Alert tone="warn" className="mb-4">Seu saldo de reivindicações deste ciclo acabou. Ele renova no próximo ciclo.</Alert>}
      {error && <Alert tone="danger" className="mb-4">Não foi possível carregar as oportunidades.</Alert>}
      {locked.length > 0 && topPlan && (
        <section aria-labelledby="urgentes" className="mb-6 rounded-2xl border border-warn/30 bg-warn-soft p-4 sm:p-5">
          <h2 id="urgentes" className="text-lg font-bold">Leads urgentes na sua região · exclusivos do {topPlan.name}</h2>
          <p className="mt-1 text-sm text-navy-900">Pessoas que informaram urgência de 8 a 10 para contratar. O contato só é liberado para assinantes {topPlan.name}.</p>
          <ul className="mt-4 space-y-3">
            {locked.map((l) => {
              const label = `${l.modality_name} em ${l.city}/${l.state}, crédito ${formatRange(l.credit_min_cents, l.credit_max_cents)}`;
              return (
                <li key={l.lead_id}>
                  <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-lg font-bold text-navy-900">{l.modality_name} · {l.city}/{l.state}</p>
                        <Badge tone="danger">Urgência {l.urgency}/10</Badge>
                        <Badge tone="navy">Exclusivo {topPlan.name}</Badge>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                        <div><dt className="text-muted">Crédito</dt><dd>{formatRange(l.credit_min_cents, l.credit_max_cents)}</dd></div>
                        <div><dt className="text-muted">Prazo</dt><dd>{l.term_months ? `${l.term_months} meses` : '—'}</dd></div>
                        <div><dt className="text-muted">Publicado</dt><dd>{formatDateTime(l.published_at)}</dd></div>
                      </dl>
                    </div>
                    <PremiumUpsellButton premium={toUpsell(topPlan)} current={currentPlan ? toUpsell(currentPlan) : null} urgency={l.urgency} leadLabel={label} />
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {u.active && leads.length === 0 ? (
        <EmptyState title="Nenhuma oportunidade compatível agora">
          Ajuste regiões e filtros em <Link className="underline" href="/painel/preferencias">Filtros e preferências</Link>. Avisaremos pelo painel e por e-mail quando surgir uma nova.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.lead_id}>
              <Card className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${highlighted === l.lead_id ? 'ring-2 ring-brand-green' : ''}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold text-navy-900">{l.modality_name} · {l.city}/{l.state}</p>
                    {l.quality_tier && <Badge tone={l.quality_tier === 'A' ? 'green' : 'neutral'}>Perfil {l.quality_tier}</Badge>}
                    {l.is_redistribution && <Badge tone="warn">Redistribuído</Badge>}
                    {l.urgency != null && <Badge tone={l.urgency >= 8 ? 'danger' : l.urgency >= 5 ? 'warn' : 'neutral'}>Urgência {l.urgency}/10</Badge>}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                    <div><dt className="text-muted">Crédito</dt><dd>{formatRange(l.credit_min_cents, l.credit_max_cents)}</dd></div>
                    <div><dt className="text-muted">Parcela</dt><dd>{formatRange(l.installment_min_cents, l.installment_max_cents)}</dd></div>
                    <div><dt className="text-muted">Prazo</dt><dd>{l.term_months ? `${l.term_months} meses` : '—'}</dd></div>
                    <div><dt className="text-muted">Administradora</dt><dd>{l.administrator_name ?? 'Sem preferência'}</dd></div>
                  </dl>
                  <p className="mt-2 text-xs text-muted">Publicado {formatDateTime(l.published_at)} · disponível até {formatDateTime(l.available_until)}</p>
                </div>
                <ClaimButton leadId={l.lead_id} disabled={noBalance} disabledReason={noBalance ? 'Saldo esgotado neste ciclo' : undefined} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
