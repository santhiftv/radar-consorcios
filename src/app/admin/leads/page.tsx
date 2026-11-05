import Link from 'next/link';
import { adminLeadAction } from '../actions';
import { RevealContact } from '@/components/admin/reveal-contact';
import { ActionForm } from '@/components/panel/action-form';
import { Badge, PageTitle, Table, Td, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { formatRange } from '@/lib/domain/money';
import { LEAD_STATUS } from '@/lib/labels';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; lead?: string }> }) {
  const { status, lead } = await searchParams;
  await requireAdmin('leads');
  const db = createAdminClient();
  let q = db
    .from('leads')
    .select('id, status, modality_id, city, state, credit_min_cents, credit_max_cents, quality_tier, published_at, redistribution_count, lead_assignments(id, status, claimed_at, plan_code, consultant_profiles(full_name))')
    .order('created_at', { ascending: false })
    .limit(150);
  if (status && LEAD_STATUS[status]) q = q.eq('status', status);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Array<{
    id: string; status: string; modality_id: string; city: string; state: string; credit_min_cents: number | null; credit_max_cents: number | null;
    quality_tier: string | null; published_at: string; redistribution_count: number;
    lead_assignments: Array<{ id: string; status: string; claimed_at: string; plan_code: string; consultant_profiles: { full_name: string } | null }>;
  }>;
  const { data: events } = lead
    ? await db.from('lead_events').select('id, event_type, actor_type, data, created_at').eq('lead_id', lead).order('created_at')
    : { data: null };

  return (
    <>
      <PageTitle title="Leads" description="Contatos só são exibidos sob demanda e cada visualização é auditada. O vencedor de uma reivindicação não pode ser alterado." />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/leads" className={`rounded-full border px-3 py-1 ${!status ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white'}`}>Todos</Link>
        {Object.entries(LEAD_STATUS).map(([k, v]) => <Link key={k} href={`/admin/leads?status=${k}`} className={`rounded-full border px-3 py-1 ${status === k ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white'}`}>{v}</Link>)}
      </nav>
      <Table headers={['Publicado', 'Oportunidade', 'Crédito', 'Status', 'Atribuições', 'Contato', 'Histórico']} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>{formatDateTime(r.published_at)}</Td>
            <Td><span className="capitalize">{r.modality_id}</span> · {r.city}/{r.state} {r.quality_tier && <Badge>{r.quality_tier}</Badge>}</Td>
            <Td>{formatRange(r.credit_min_cents, r.credit_max_cents)}</Td>
            <Td><Badge tone={r.status === 'open' ? 'green' : 'neutral'}>{LEAD_STATUS[r.status]}</Badge>{r.redistribution_count > 0 && <span className="ml-1 text-xs text-muted">↻{r.redistribution_count}</span>}</Td>
            <Td>{r.lead_assignments.map((a) => <div key={a.id} className="text-xs">{a.consultant_profiles?.full_name} ({a.plan_code}) · {a.status} · {formatDateTime(a.claimed_at)}</div>)}</Td>
            <Td><RevealContact leadId={r.id} /></Td>
            <Td><Link href={`/admin/leads?lead=${r.id}${status ? `&status=${status}` : ''}`} className="text-xs underline">Ver</Link></Td>
          </tr>
        ))}
      </Table>
      {lead && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="card p-5">
            <h2 className="font-bold">Linha do tempo (imutável)</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(events ?? []).map((e: { id: number; event_type: string; actor_type: string; data: unknown; created_at: string }) => (
                <li key={e.id} className="rounded-lg bg-navy-50 p-2"><strong>{e.event_type}</strong> · {e.actor_type} · {formatDateTime(e.created_at)}<pre className="mt-1 overflow-x-auto text-xs text-muted">{JSON.stringify(e.data)}</pre></li>
              ))}
            </ol>
          </div>
          <div className="card p-5">
            <h2 className="font-bold">Ação administrativa</h2>
            <ActionForm action={adminLeadAction} submitLabel="Aplicar" submitVariant="danger" className="mt-3 space-y-3">
              <input type="hidden" name="leadId" value={lead} />
              <select name="action" className="field-input"><option value="invalidate">Marcar como inválido</option><option value="withdraw">Retirar (pedido do titular)</option></select>
              <textarea name="reason" required rows={3} placeholder="Motivo (obrigatório, auditado)" className="field-input" />
            </ActionForm>
          </div>
        </div>
      )}
    </>
  );
}
