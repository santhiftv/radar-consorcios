import { createTicketAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Badge, Card, PageTitle, formatDateTime } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';

const STATUS: Record<string, string> = { open: 'Aberto', answered: 'Respondido', closed: 'Fechado' };

export default async function SuportePage() {
  const { supabase } = await requireConsultant();
  const { data } = await supabase.from('support_tickets').select('id, subject, message, status, priority, admin_reply, created_at, answered_at').order('created_at', { ascending: false }).limit(50);
  return (
    <>
      <PageTitle title="Suporte" description="Abra um chamado. Assinantes Premium têm atendimento prioritário." />
      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="font-bold">Novo chamado</h2>
          <ActionForm action={createTicketAction} submitLabel="Enviar" className="mt-3 space-y-3" resetOnSuccess>
            <select name="kind" className="field-input" defaultValue="support">
              <option value="support">Dúvida ou problema</option>
              <option value="billing">Pagamento e plano</option>
              <option value="privacy">Privacidade</option>
            </select>
            <input name="subject" required minLength={3} maxLength={160} placeholder="Assunto" className="field-input" />
            <textarea name="message" required minLength={5} maxLength={5000} rows={5} placeholder="Descreva sua solicitação (não inclua dados de consumidores)" className="field-input" />
          </ActionForm>
        </Card>
        <div className="space-y-3">
          {(data ?? []).length === 0 && <p className="text-sm text-muted">Nenhum chamado.</p>}
          {(data ?? []).map((t: { id: string; subject: string; message: string; status: string; priority: string; admin_reply: string | null; created_at: string; answered_at: string | null }) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{t.subject}</p>
                <Badge tone={t.status === 'answered' ? 'green' : 'neutral'}>{STATUS[t.status]}</Badge>
                {t.priority === 'high' && <Badge tone="navy">Prioritário</Badge>}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{t.message}</p>
              {t.admin_reply && <div className="mt-3 rounded-lg bg-navy-50 p-3 text-sm"><p className="font-semibold">Resposta ({formatDateTime(t.answered_at)})</p><p className="whitespace-pre-line">{t.admin_reply}</p></div>}
              <p className="mt-2 text-xs text-muted">{formatDateTime(t.created_at)}</p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
