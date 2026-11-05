import { rows } from '@/lib/server/queries';
import { syncSubscriptionAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Badge, PageTitle, Table, Td, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { formatBRL } from '@/lib/domain/money';
import { SUBSCRIPTION_STATUS } from '@/lib/labels';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminAssinaturasPage() {
  await requireAdmin('billing');
  const db = createAdminClient();
  const [{ data: subs }, { data: events }] = await Promise.all([
    db.from('subscriptions').select('id, status, price_cents, claim_limit, current_period_end, grace_until, cancel_at_period_end, provider_subscription_id, last_provider_status, created_at, plans(name), consultant_profiles(full_name)').order('created_at', { ascending: false }).limit(100),
    db.from('payment_events').select('id, event_type, provider_resource_id, status, error, received_at').order('received_at', { ascending: false }).limit(50),
  ]);
  return (
    <>
      <PageTitle title="Assinaturas e pagamentos" description="Estados confirmados pelo provedor via webhook. Use “Sincronizar” para reconsultar o Mercado Pago." />
      <Table headers={['Consultor', 'Plano', 'Status', 'Valor', 'Fim do ciclo', 'Provedor', '']} empty={(subs ?? []).length === 0}>
        {rows<{ id: string; status: string; price_cents: number; current_period_end: string | null; grace_until: string | null; cancel_at_period_end: boolean; provider_subscription_id: string | null; last_provider_status: string | null; plans: { name: string } | null; consultant_profiles: { full_name: string } | null }>(subs).map((s) => (
          <tr key={s.id}>
            <Td>{s.consultant_profiles?.full_name}</Td>
            <Td>{s.plans?.name}</Td>
            <Td><Badge tone={s.status === 'active' ? 'green' : s.status === 'pending' ? 'neutral' : 'warn'}>{SUBSCRIPTION_STATUS[s.status]}</Badge>{s.cancel_at_period_end && <span className="ml-1 text-xs text-warn">não renova</span>}</Td>
            <Td>{formatBRL(s.price_cents)}</Td>
            <Td>{formatDateTime(s.current_period_end)}{s.grace_until && <div className="text-xs text-muted">carência {formatDateTime(s.grace_until)}</div>}</Td>
            <Td className="text-xs">{s.provider_subscription_id ?? '—'}<div className="text-muted">{s.last_provider_status}</div></Td>
            <Td>{s.provider_subscription_id && <ActionForm action={syncSubscriptionAction} submitLabel="Sincronizar" submitVariant="secondary" className="space-y-1"><input type="hidden" name="subscriptionId" value={s.id} /></ActionForm>}</Td>
          </tr>
        ))}
      </Table>
      <h2 className="mt-10 text-xl font-bold">Eventos de webhook</h2>
      <div className="mt-4">
        <Table headers={['Recebido', 'Tipo', 'Recurso', 'Status', 'Erro']} empty={(events ?? []).length === 0}>
          {(events ?? []).map((e: { id: string; event_type: string; provider_resource_id: string | null; status: string; error: string | null; received_at: string }) => (
            <tr key={e.id}>
              <Td>{formatDateTime(e.received_at)}</Td><Td>{e.event_type}</Td><Td className="text-xs">{e.provider_resource_id}</Td>
              <Td><Badge tone={e.status === 'processed' ? 'green' : e.status === 'failed' ? 'danger' : 'neutral'}>{e.status}</Badge></Td>
              <Td className="max-w-xs truncate text-xs text-muted">{e.error}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
