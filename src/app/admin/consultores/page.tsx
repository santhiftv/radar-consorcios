import { rows as asRows } from '@/lib/server/queries';
import { replyTicketAction, reviewEligibilityAction, verifyConsultantAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Badge, Card, PageTitle, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { SUBSCRIPTION_STATUS, VERIFICATION_STATUS } from '@/lib/labels';
import { formatPhoneBR } from '@/lib/domain/validation';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminConsultoresPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  await requireAdmin('consultants');
  const db = createAdminClient();
  let q = db
    .from('consultant_profiles')
    .select('user_id, full_name, professional_phone, city, state, company, professional_reference, verification_status, verification_notes, created_at, subscriptions(status, plans(name)), administrator_eligibility(administrator_id, status, evidence_note, administrators(name))')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status && VERIFICATION_STATUS[status]) q = q.eq('verification_status', status);
  const [{ data }, { data: tickets }] = await Promise.all([
    q,
    db.from('support_tickets').select('id, kind, subject, message, priority, status, requester_email, created_at, consultant_profiles(full_name)').in('status', ['open']).order('priority').order('created_at').limit(50),
  ]);
  const rows = (data ?? []) as unknown as Array<{
    user_id: string; full_name: string; professional_phone: string; city: string; state: string; company: string | null; professional_reference: string | null;
    verification_status: string; verification_notes: string | null; created_at: string;
    subscriptions: Array<{ status: string; plans: { name: string } | null }>;
    administrator_eligibility: Array<{ administrator_id: string; status: string; evidence_note: string | null; administrators: { name: string } | null }>;
  }>;

  return (
    <>
      <PageTitle title="Consultores" description="Verificação de perfil e de habilitação por administradora. Não presuma vínculo sem comprovação." />
      <form className="mb-4 flex gap-2 text-sm">
        <select name="status" defaultValue={status ?? ''} className="field-input w-56"><option value="">Todos</option>{Object.entries(VERIFICATION_STATUS).filter(([k]) => k !== 'revoked').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="rounded-lg bg-navy-900 px-4 text-white">Filtrar</button>
      </form>
      <div className="space-y-4">
        {rows.length === 0 && <p className="text-sm text-muted">Nenhum consultor.</p>}
        {rows.map((c) => {
          const sub = c.subscriptions.find((s) => ['active', 'past_due', 'pending', 'paused'].includes(s.status));
          return (
            <Card key={c.user_id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold">{c.full_name} <Badge tone={c.verification_status === 'verified' ? 'green' : c.verification_status === 'pending' ? 'neutral' : 'danger'}>{VERIFICATION_STATUS[c.verification_status]}</Badge></p>
                  <p className="text-sm text-muted">{formatPhoneBR(c.professional_phone)} · {c.city}/{c.state}{c.company && ` · ${c.company}`} · desde {formatDateTime(c.created_at)}</p>
                  {c.professional_reference && <p className="text-sm">Referência: {c.professional_reference}</p>}
                  <p className="mt-1 text-sm">Assinatura: {sub ? `${sub.plans?.name} — ${SUBSCRIPTION_STATUS[sub.status]}` : 'nenhuma'}</p>
                </div>
                <ActionForm action={verifyConsultantAction} submitLabel="Atualizar" className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="userId" value={c.user_id} />
                  <select name="status" defaultValue={c.verification_status} className="field-input w-40 py-1.5 text-sm">
                    <option value="pending">Em verificação</option><option value="verified">Verificado</option><option value="rejected">Recusado</option><option value="suspended">Suspenso</option>
                  </select>
                  <input name="notes" defaultValue={c.verification_notes ?? ''} placeholder="Observação / motivo" className="field-input w-56 py-1.5 text-sm" />
                </ActionForm>
              </div>
              {c.administrator_eligibility.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-sm font-semibold">Habilitações declaradas</p>
                  <ul className="mt-2 space-y-2">
                    {c.administrator_eligibility.map((e) => (
                      <li key={e.administrator_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>{e.administrators?.name} · <Badge tone={e.status === 'verified' ? 'green' : 'neutral'}>{VERIFICATION_STATUS[e.status]}</Badge> {e.evidence_note && <span className="text-muted">— {e.evidence_note}</span>}</span>
                        <ActionForm action={reviewEligibilityAction} submitLabel="Salvar" submitVariant="secondary" className="flex gap-2">
                          <input type="hidden" name="consultantId" value={c.user_id} />
                          <input type="hidden" name="administratorId" value={e.administrator_id} />
                          <select name="status" defaultValue={e.status} className="field-input w-36 py-1 text-sm"><option value="pending">Pendente</option><option value="verified">Verificar</option><option value="rejected">Recusar</option><option value="revoked">Revogar</option></select>
                        </ActionForm>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <h2 className="mt-10 text-xl font-bold">Chamados abertos (suporte e contato)</h2>
      <div className="mt-4 space-y-3">
        {(tickets ?? []).length === 0 && <p className="text-sm text-muted">Nenhum chamado aberto.</p>}
        {asRows<{ id: string; kind: string; subject: string; message: string; priority: string; requester_email: string | null; created_at: string; consultant_profiles: { full_name: string } | null }>(tickets).map((t) => (
          <Card key={t.id} className="p-5">
            <p className="font-semibold">{t.subject} {t.priority === 'high' && <Badge tone="navy">Prioritário</Badge>} <Badge>{t.kind}</Badge></p>
            <p className="text-xs text-muted">{t.consultant_profiles?.full_name ?? t.requester_email} · {formatDateTime(t.created_at)}</p>
            <p className="mt-2 whitespace-pre-line text-sm">{t.message}</p>
            <ActionForm action={replyTicketAction} submitLabel="Responder" className="mt-3 space-y-2">
              <input type="hidden" name="ticketId" value={t.id} />
              <textarea name="reply" rows={3} required className="field-input" placeholder={t.kind === 'contact' ? 'Registre a resposta enviada por e-mail' : 'Resposta visível ao consultor'} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="close" /> Encerrar chamado</label>
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
