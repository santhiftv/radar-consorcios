import { rows } from '@/lib/server/queries';
import { retryDeliveryAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Badge, PageTitle, Table, Td, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/server/deps';
import { integrationStatus } from '@/lib/server/env';

export default async function AdminNotificacoesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  await requireAdmin('notifications');
  let q = createAdminClient()
    .from('notification_deliveries')
    .select('id, channel, status, attempts, last_error, scheduled_for, sent_at, created_at, notifications(type, title)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  const email = integrationStatus().find((i) => i.name.startsWith('Resend'));
  return (
    <>
      <PageTitle title="Notificações" description={`Registro de entregas e falhas. Provedor de e-mail: ${email?.ok ? 'configurado' : 'NÃO configurado (e-mails falham e ficam registrados)'}.`} />
      <form className="mb-3 flex gap-2 text-sm">
        <select name="status" defaultValue={status ?? ''} className="field-input w-48">
          <option value="">Todas</option>
          {['pending', 'processing', 'sent', 'failed', 'dead', 'skipped'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="rounded-lg bg-navy-900 px-4 text-white">Filtrar</button>
      </form>
      <Table headers={['Criada', 'Tipo', 'Canal', 'Status', 'Tentativas', 'Agendada', 'Erro', '']} empty={(data ?? []).length === 0}>
        {rows<{ id: string; channel: string; status: string; attempts: number; last_error: string | null; scheduled_for: string; created_at: string; notifications: { type: string; title: string } | null }>(data).map((d) => (
          <tr key={d.id}>
            <Td>{formatDateTime(d.created_at)}</Td>
            <Td>{d.notifications?.type}</Td>
            <Td>{d.channel}</Td>
            <Td><Badge tone={d.status === 'sent' ? 'green' : d.status === 'dead' || d.status === 'failed' ? 'danger' : 'neutral'}>{d.status}</Badge></Td>
            <Td>{d.attempts}</Td>
            <Td>{formatDateTime(d.scheduled_for)}</Td>
            <Td className="max-w-xs truncate text-xs text-muted">{d.last_error}</Td>
            <Td>{['failed', 'dead'].includes(d.status) && <ActionForm action={retryDeliveryAction} submitLabel="Reenviar" submitVariant="secondary"><input type="hidden" name="deliveryId" value={d.id} /></ActionForm>}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
