import Link from 'next/link';
import { Alert, Card, PageTitle, Stat } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { formatBRL } from '@/lib/domain/money';
import { CLAIM_RESULT, LEAD_STATUS } from '@/lib/labels';
import { serviceRpc } from '@/lib/server/deps';

interface Metrics {
  lead_requests: number;
  duplicates: number;
  leads_by_status: Record<string, number>;
  leads_by_modality: Record<string, number>;
  claims: number;
  claim_attempts_by_result: Record<string, number>;
  median_minutes_to_claim: number | null;
  active_subscriptions_by_plan: Record<string, number>;
  mrr_cents: number;
  consultants_pending_verification: number;
  open_contests: number;
  open_privacy_requests: number;
  failed_deliveries: number;
  failed_payment_events: number;
  articles_in_review: number;
}

function Bars({ data, labels }: { data: Record<string, number>; labels?: Record<string, string> }) {
  const max = Math.max(1, ...Object.values(data));
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return <p className="text-sm text-muted">Sem dados.</p>;
  return (
    <ul className="space-y-2">
      {entries.map(([k, v]) => (
        <li key={k}>
          <div className="flex justify-between text-sm"><span>{labels?.[k] ?? k}</span><span className="font-semibold">{v}</span></div>
          <div className="mt-1 h-2 rounded-full bg-navy-50"><div className="h-2 rounded-full bg-navy-800" style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ dias?: string; 'sem-permissao'?: string }> }) {
  const sp = await searchParams;
  const { user } = await requireAdmin('dashboard');
  const days = [7, 30, 90].includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const { data, error } = await serviceRpc(user.id)<Metrics>('admin_dashboard_metrics', { p_days: days });
  const m = data;

  return (
    <>
      <PageTitle
        title="Dashboard geral"
        description="Indicadores agregados, sem dados pessoais."
        actions={<form className="flex gap-2 text-sm">{[7, 30, 90].map((d) => <button key={d} name="dias" value={d} className={`rounded-lg border px-3 py-1.5 ${d === days ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white'}`}>{d} dias</button>)}</form>}
      />
      {sp['sem-permissao'] && <Alert tone="warn" className="mb-4">Sua função não tem acesso àquela área.</Alert>}
      {error || !m ? (
        <Alert tone="danger">Não foi possível carregar os indicadores.</Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Solicitações recebidas" value={m.lead_requests} hint={`${m.duplicates} duplicidades bloqueadas`} />
            <Stat label="Reivindicações" value={m.claims} hint={m.median_minutes_to_claim != null ? `Mediana ${m.median_minutes_to_claim} min até reivindicar` : undefined} />
            <Stat label="Receita recorrente (MRR)" value={formatBRL(m.mrr_cents, { cents: false })} />
            <Stat label="Assinaturas ativas" value={Object.values(m.active_subscriptions_by_plan).reduce((a, b) => a + b, 0)} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ['Consultores a verificar', m.consultants_pending_verification, '/admin/consultores'],
              ['Contestações abertas', m.open_contests, '/admin/contestacoes'],
              ['Pedidos de titulares', m.open_privacy_requests, '/admin/privacidade'],
              ['Artigos em revisão', m.articles_in_review, '/admin/blog'],
              ['Entregas com falha', m.failed_deliveries, '/admin/notificacoes'],
              ['Webhooks com falha', m.failed_payment_events, '/admin/assinaturas'],
            ].map(([label, value, href]) => (
              <Link key={String(label)} href={String(href)} className={`rounded-xl border p-4 text-sm ${Number(value) > 0 ? 'border-warn/40 bg-warn-soft' : 'border-line bg-white'}`}>
                <p className="text-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="p-5"><h2 className="mb-3 font-bold">Leads por status</h2><Bars data={m.leads_by_status} labels={LEAD_STATUS} /></Card>
            <Card className="p-5"><h2 className="mb-3 font-bold">Leads por modalidade</h2><Bars data={m.leads_by_modality} /></Card>
            <Card className="p-5"><h2 className="mb-3 font-bold">Tentativas de reivindicação</h2><Bars data={m.claim_attempts_by_result} labels={CLAIM_RESULT} /></Card>
          </div>
        </>
      )}
    </>
  );
}
