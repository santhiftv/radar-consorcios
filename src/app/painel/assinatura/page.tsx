import { cancelSubscriptionAction } from '../actions';
import { PlanPolicies } from '@/components/content-blocks';
import { ActionForm } from '@/components/panel/action-form';
import { CheckoutButton } from '@/components/panel/checkout-button';
import { Alert, Badge, Card, PageTitle, formatDateTime } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';
import { SUBSCRIPTION_STATUS } from '@/lib/labels';
import { formatBRL } from '@/lib/domain/money';
import { getPlans, rows } from '@/lib/server/queries';
import { describeClaimLimit } from '@/lib/domain/plans';

interface Usage {
  active: boolean;
  status?: string;
  plan_code?: string;
  plan_name?: string;
  claim_limit?: number | string;
  claims_used?: number;
  remaining?: number | string;
  unlimited?: boolean;
  period_start?: string;
  period_end?: string;
  grace_until?: string | null;
  cancel_at_period_end?: boolean;
  checkout_url?: string | null;
}

export default async function AssinaturaPage({ searchParams }: { searchParams: Promise<{ retorno?: string; plano?: string }> }) {
  const { retorno, plano } = await searchParams;
  const { supabase, profile } = await requireConsultant();
  const [{ data }, plans, { data: history }] = await Promise.all([
    supabase.rpc('consultant_usage'),
    getPlans(),
    supabase.from('subscriptions').select('id, status, price_cents, created_at, current_period_end, plans(name)').order('created_at', { ascending: false }).limit(10),
  ]);
  const u = (data ?? { active: false }) as Usage;
  const preferred = plano ?? profile?.intended_plan_code ?? 'profissional';

  return (
    <>
      <PageTitle title="Plano e assinatura" description="Pagamentos processados pelo Mercado Pago. O acesso é liberado somente após a confirmação do provedor." />

      {retorno === 'checkout' && !u.active && (
        <Alert tone="neutral" title="Aguardando confirmação do pagamento" className="mb-4">
          Recebemos seu retorno do Mercado Pago. A liberação acontece automaticamente quando o provedor confirmar o pagamento — isso pode levar alguns minutos (Pix/cartão) ou mais (boleto). Atualize esta página em instantes.
        </Alert>
      )}
      {u.status === 'rejected' && (
        <Alert tone="danger" title="Pagamento recusado" className="mb-4">Escolha o plano novamente para tentar com outro meio de pagamento.</Alert>
      )}

      {u.active ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">Plano {u.plan_name}</h2>
            <Badge tone={u.status === 'active' ? 'green' : 'warn'}>{SUBSCRIPTION_STATUS[u.status ?? ''] ?? u.status}</Badge>
            {u.cancel_at_period_end && <Badge tone="warn">Renovação cancelada</Badge>}
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-muted">Ciclo atual</dt><dd>{formatDateTime(u.period_start)} – {formatDateTime(u.period_end)}</dd></div>
            <div><dt className="text-muted">Reivindicações</dt><dd>{u.unlimited ? `${u.claims_used} (sem limite)` : `${u.claims_used}/${u.claim_limit}`}</dd></div>
            <div><dt className="text-muted">Saldo</dt><dd className="font-semibold">{u.unlimited ? 'Sem limite' : u.remaining}</dd></div>
            {u.grace_until && <div><dt className="text-muted">Carência até</dt><dd>{formatDateTime(u.grace_until)}</dd></div>}
          </dl>
          {!u.cancel_at_period_end && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-danger">Cancelar renovação</summary>
              <div className="mt-3 max-w-md">
                <p className="text-sm text-muted">As próximas cobranças serão canceladas no Mercado Pago. Seu acesso continua até o fim do ciclo pago.</p>
                <ActionForm action={cancelSubscriptionAction} submitLabel="Confirmar cancelamento" submitVariant="danger" className="mt-3 space-y-3" />
              </div>
            </details>
          )}
          <p className="mt-6 text-sm text-muted">Para trocar de plano, abra um chamado em Suporte (a troca vale a partir do próximo ciclo).</p>
        </Card>
      ) : (
        <>
          {u.status === 'pending' && u.checkout_url && (
            <Alert tone="warn" title="Pagamento pendente" className="mb-4">
              Você iniciou a assinatura do plano {u.plan_name}.{' '}
              <a href={u.checkout_url} className="font-semibold underline">Continuar no Mercado Pago</a> ou escolha outro plano abaixo.
            </Alert>
          )}
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.code} className={`flex flex-col p-6 ${p.code === preferred ? 'ring-2 ring-navy-900' : ''}`}>
                <h2 className="text-lg font-bold">{p.name}</h2>
                <p className="mt-2"><span className="font-display text-3xl font-extrabold">{formatBRL(p.priceCents, { cents: false })}</span><span className="text-muted">/mês</span></p>
                <p className="mt-1 text-sm font-semibold text-brand-green-dark">{describeClaimLimit(p)}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {p.features.map((f) => <li key={f}>✓ {f}</li>)}
                </ul>
                <div className="mt-5"><CheckoutButton planCode={p.code} label={`Assinar ${p.name}`} /></div>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Ao assinar, você concorda com os Termos do Consultor aceitos no cadastro. Renovação mensal automática.</p>
        </>
      )}

      <div className="mt-8"><PlanPolicies plans={plans} /></div>

      <Card className="mt-8 p-5">
        <h2 className="font-bold">Histórico</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {rows<{ id: string; status: string; price_cents: number; created_at: string; plans: { name: string } | null }>(history).map((h) => (
            <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{h.plans?.name} · {formatBRL(h.price_cents)}</span>
              <span className="text-muted">{SUBSCRIPTION_STATUS[h.status] ?? h.status} · {formatDateTime(h.created_at)}</span>
            </li>
          ))}
          {(history ?? []).length === 0 && <li className="py-2 text-muted">Nenhuma assinatura ainda.</li>}
        </ul>
      </Card>
    </>
  );
}
