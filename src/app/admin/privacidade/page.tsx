import { completeDeletionAction, correctLeadRequestAction, resolvePrivacyRequestAction } from '../actions';
import { ExportSubjectButton } from '@/components/admin/export-button';
import { ActionForm } from '@/components/panel/action-form';
import { Alert, Badge, Card, PageTitle, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { PRIVACY_STATUS } from '@/lib/labels';
import { PRIVACY_REQUEST_TYPES, type PrivacyRequestType } from '@/lib/services/privacy';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminPrivacidadePage({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const { todos } = await searchParams;
  await requireAdmin('privacy');
  const db = createAdminClient();
  let q = db.from('privacy_requests').select('*').order('created_at', { ascending: false }).limit(100);
  if (!todos) q = q.in('status', ['open', 'in_progress']);
  const { data } = await q;
  const requests = (data ?? []) as Array<{ id: string; request_type: string; email: string; email_hash: string; details: string | null; status: string; created_at: string; confirmed_at: string | null; due_at: string | null; resolution_note: string | null }>;

  const correctionHashes = requests.filter((r) => r.request_type === 'correction').map((r) => r.email_hash);
  const { data: lrs } = correctionHashes.length
    ? await db.from('lead_requests').select('id, email_hash, full_name, email, phone_e164, created_at').in('email_hash', correctionHashes)
    : { data: [] };

  return (
    <>
      <PageTitle title="Privacidade e solicitações dos titulares" description="Pedidos confirmados pelo titular por e-mail. Prazo interno: 15 dias. Revogações e opt-out são atendidos automaticamente." />
      <Alert tone="neutral" className="mb-4">Antes de excluir, verifique se há obrigação legal de retenção (ex.: defesa em processo, registros de consentimento). A exclusão anonimiza os dados e mantém apenas um hash na lista de supressão.</Alert>
      <a href={todos ? '/admin/privacidade' : '/admin/privacidade?todos=1'} className="mb-4 inline-block text-sm underline">{todos ? 'Mostrar apenas pendentes' : 'Mostrar todos (inclui concluídos e não confirmados)'}</a>
      <div className="space-y-4">
        {requests.length === 0 && <p className="text-sm text-muted">Nenhuma solicitação pendente.</p>}
        {requests.map((r) => {
          const overdue = r.due_at && new Date(r.due_at) < new Date() && ['open', 'in_progress'].includes(r.status);
          return (
            <Card key={r.id} className={`p-5 ${overdue ? 'ring-2 ring-danger' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{PRIVACY_REQUEST_TYPES[r.request_type as PrivacyRequestType]} <Badge tone={r.status === 'completed' ? 'green' : 'warn'}>{PRIVACY_STATUS[r.status]}</Badge> {overdue && <Badge tone="danger">Prazo vencido</Badge>}</p>
                  <p className="text-sm text-muted">{r.email} · criada {formatDateTime(r.created_at)} · confirmada {formatDateTime(r.confirmed_at)} · prazo {formatDateTime(r.due_at)}</p>
                  {r.details && <p className="mt-2 text-sm">“{r.details}”</p>}
                  {r.resolution_note && <p className="mt-1 text-sm text-muted">Desfecho: {r.resolution_note}</p>}
                </div>
                {['open', 'in_progress'].includes(r.status) && <ExportSubjectButton requestId={r.id} />}
              </div>
              {['open', 'in_progress'].includes(r.status) && (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 lg:grid-cols-2">
                  {r.request_type === 'deletion' && (
                    <ActionForm action={completeDeletionAction} submitLabel="Anonimizar dados e concluir" submitVariant="danger" className="space-y-2">
                      <input type="hidden" name="requestId" value={r.id} />
                      <textarea name="note" rows={2} placeholder="Registro da análise (ex.: sem obrigação de retenção)" className="field-input" />
                    </ActionForm>
                  )}
                  {r.request_type === 'correction' && (
                    <div className="space-y-3">
                      {(lrs ?? []).filter((l: { email_hash: string }) => l.email_hash === r.email_hash).map((l: { id: string; full_name: string | null; email: string | null; phone_e164: string | null; created_at: string }) => (
                        <ActionForm key={l.id} action={correctLeadRequestAction} submitLabel="Corrigir" submitVariant="secondary" className="space-y-2 rounded-lg bg-navy-50 p-3">
                          <input type="hidden" name="leadRequestId" value={l.id} />
                          <p className="text-xs text-muted">Pedido de {formatDateTime(l.created_at)}</p>
                          <input name="fullName" defaultValue={l.full_name ?? ''} className="field-input text-sm" />
                          <input name="email" defaultValue={l.email ?? ''} className="field-input text-sm" />
                          <input name="phone" defaultValue={l.phone_e164 ?? ''} className="field-input text-sm" />
                        </ActionForm>
                      ))}
                    </div>
                  )}
                  <ActionForm action={resolvePrivacyRequestAction} submitLabel="Registrar desfecho" className="space-y-2">
                    <input type="hidden" name="requestId" value={r.id} />
                    <select name="status" className="field-input"><option value="completed">Concluída</option><option value="in_progress">Em andamento</option><option value="rejected">Recusada (com justificativa)</option></select>
                    <textarea name="note" rows={2} required placeholder="Resposta/justificativa ao titular (envie também por e-mail)" className="field-input" />
                  </ActionForm>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
