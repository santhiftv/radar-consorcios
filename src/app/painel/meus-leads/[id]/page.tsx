import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createContestAction, updateAssignmentStatusAction } from '../../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Alert, Badge, Card, PageTitle, formatDateTime } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';
import { ASSIGNMENT_STATUS, CONTEST_REASONS, CONTEST_STATUS } from '@/lib/labels';
import { formatRange } from '@/lib/domain/money';
import { formatPhoneBR, isUuid } from '@/lib/domain/validation';

const CHANNEL: Record<string, string> = { whatsapp: 'WhatsApp', phone: 'Ligação', email: 'E-mail' };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireConsultant();

  const { data: lead } = await supabase
    .from('leads')
    .select('id, modality_id, city, state, credit_min_cents, credit_max_cents, installment_min_cents, installment_max_cents, term_months, preferred_administrator_id, quality_tier, administrators(name)')
    .eq('id', id)
    .maybeSingle();
  if (!lead) notFound(); // RLS: só aparece se estiver atribuído a você

  const [{ data: contactRows, error: contactError }, { data: contest }] = await Promise.all([
    supabase.rpc('get_lead_contact', { p_lead_id: id }), // registra acesso em lead_events
    supabase.from('lead_contests').select('status, reason, resolution_note, assignment_id, lead_assignments!inner(lead_id)').eq('lead_assignments.lead_id', id).maybeSingle(),
  ]);
  const contact = (contactRows ?? [])[0] as
    | { full_name: string | null; email: string | null; phone_e164: string | null; neighborhood: string | null; best_contact_time: string | null; preferred_channel: string | null; assignment_id: string; assignment_status: string; contact_deadline: string }
    | undefined;

  const waNumber = contact?.phone_e164?.replace('+', '');
  const adminName = (lead as unknown as { administrators: { name: string } | null }).administrators?.name;

  return (
    <>
      <Link href="/painel/meus-leads" className="text-sm text-navy-700 underline">← Meus leads</Link>
      <PageTitle title={`${lead.modality_id} · ${lead.city}/${lead.state}`} description="Use os dados somente para o contato solicitado pelo titular." />
      {contactError || !contact ? (
        <Alert tone="danger">Contato indisponível (a atribuição pode ter expirado ou o titular revogou a autorização).</Alert>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Contato</h2>
                <Badge tone={contact.assignment_status === 'active' ? 'warn' : 'green'}>{ASSIGNMENT_STATUS[contact.assignment_status]}</Badge>
              </div>
              {contact.full_name === null ? (
                <p className="mt-3 text-sm text-muted">Dados anonimizados a pedido do titular ou por retenção.</p>
              ) : (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted">Nome</dt><dd className="font-medium">{contact.full_name}</dd></div>
                  <div><dt className="text-muted">Canal preferido</dt><dd className="font-medium">{CHANNEL[contact.preferred_channel ?? ''] ?? '—'}</dd></div>
                  <div><dt className="text-muted">Telefone</dt><dd className="font-medium"><a className="underline" href={`tel:${contact.phone_e164}`}>{formatPhoneBR(contact.phone_e164)}</a>{waNumber && <> · <a className="underline" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</dd></div>
                  <div><dt className="text-muted">E-mail</dt><dd className="font-medium"><a className="underline" href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>
                  <div><dt className="text-muted">Bairro</dt><dd>{contact.neighborhood ?? '—'}</dd></div>
                  <div><dt className="text-muted">Melhor horário</dt><dd>{contact.best_contact_time ?? 'Qualquer horário'}</dd></div>
                </dl>
              )}
              {contact.assignment_status === 'active' && (
                <Alert tone="warn" className="mt-4">Registre o contato até <strong>{formatDateTime(contact.contact_deadline)}</strong>. Sem registro, a atribuição expira e a reivindicação não é devolvida.</Alert>
              )}
            </Card>
            <Card className="p-6">
              <h2 className="text-lg font-bold">Pedido</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-muted">Crédito</dt><dd>{formatRange(lead.credit_min_cents, lead.credit_max_cents)}</dd></div>
                <div><dt className="text-muted">Parcela</dt><dd>{formatRange(lead.installment_min_cents, lead.installment_max_cents)}</dd></div>
                <div><dt className="text-muted">Prazo</dt><dd>{lead.term_months ? `${lead.term_months} meses` : '—'}</dd></div>
                <div><dt className="text-muted">Administradora</dt><dd>{adminName ?? 'Sem preferência'}</dd></div>
                <div><dt className="text-muted">Perfil</dt><dd>{lead.quality_tier ?? '—'}</dd></div>
              </dl>
            </Card>
          </div>
          <div className="space-y-6">
            {['active', 'contacted'].includes(contact.assignment_status) && (
              <Card className="p-5">
                <h2 className="font-bold">Atualizar status</h2>
                <ActionForm action={updateAssignmentStatusAction} submitLabel="Salvar status" className="mt-3 space-y-3">
                  <input type="hidden" name="assignmentId" value={contact.assignment_id} />
                  <select name="status" className="field-input" defaultValue={contact.assignment_status === 'active' ? 'contacted' : 'converted'}>
                    {contact.assignment_status === 'active' && <option value="contacted">Contatado</option>}
                    <option value="converted">Venda realizada</option>
                    <option value="lost">Sem negócio</option>
                  </select>
                  <textarea name="note" rows={3} maxLength={1000} placeholder="Observação (opcional, sem dados sensíveis)" className="field-input" />
                </ActionForm>
              </Card>
            )}
            <Card className="p-5">
              <h2 className="font-bold">Contestar lead</h2>
              {contest ? (
                <p className="mt-2 text-sm">
                  Contestação: <strong>{CONTEST_STATUS[contest.status]}</strong> ({CONTEST_REASONS[contest.reason]}).
                  {contest.resolution_note && <span className="block text-muted">Resposta: {contest.resolution_note}</span>}
                </p>
              ) : (
                <ActionForm action={createContestAction} submitLabel="Enviar contestação" submitVariant="secondary" className="mt-3 space-y-3">
                  <input type="hidden" name="assignmentId" value={contact.assignment_id} />
                  <select name="reason" className="field-input" required defaultValue="">
                    <option value="" disabled>Motivo</option>
                    {Object.entries(CONTEST_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <textarea name="details" rows={3} maxLength={1000} placeholder="Descreva o que aconteceu" className="field-input" />
                  <p className="text-xs text-muted">Prazo: 7 dias após a reivindicação. Contestações aceitas devolvem a reivindicação.</p>
                </ActionForm>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
