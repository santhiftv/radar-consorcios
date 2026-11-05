import { resolveContestAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Badge, Card, PageTitle, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { CONTEST_REASONS, CONTEST_STATUS } from '@/lib/labels';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminContestacoesPage() {
  await requireAdmin('contests');
  const { data } = await createAdminClient()
    .from('lead_contests')
    .select('id, reason, details, status, resolution_note, created_at, resolved_at, consultant_profiles(full_name), lead_assignments(lead_id, claimed_at, leads(modality_id, city, state))')
    .order('status')
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Array<{
    id: string; reason: string; details: string | null; status: string; resolution_note: string | null; created_at: string;
    consultant_profiles: { full_name: string } | null;
    lead_assignments: { lead_id: string; claimed_at: string; leads: { modality_id: string; city: string; state: string } | null } | null;
  }>;
  return (
    <>
      <PageTitle title="Contestações e reposições" description="Contestação aceita invalida o lead e devolve 1 reivindicação ao saldo do ciclo. Justificativa obrigatória." />
      <div className="space-y-4">
        {rows.length === 0 && <p className="text-sm text-muted">Nenhuma contestação.</p>}
        {rows.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{CONTEST_REASONS[c.reason]} <Badge tone={c.status === 'open' ? 'warn' : c.status === 'accepted' ? 'green' : 'neutral'}>{CONTEST_STATUS[c.status]}</Badge></p>
                <p className="text-sm text-muted">{c.consultant_profiles?.full_name} · {c.lead_assignments?.leads?.modality_id} em {c.lead_assignments?.leads?.city}/{c.lead_assignments?.leads?.state} · reivindicado {formatDateTime(c.lead_assignments?.claimed_at)} · contestado {formatDateTime(c.created_at)}</p>
                {c.details && <p className="mt-2 text-sm">“{c.details}”</p>}
                {c.resolution_note && <p className="mt-2 text-sm text-muted">Decisão: {c.resolution_note}</p>}
                <a href={`/admin/leads?lead=${c.lead_assignments?.lead_id}`} className="mt-2 inline-block text-xs underline">Ver linha do tempo do lead</a>
              </div>
              {c.status === 'open' && (
                <ActionForm action={resolveContestAction} submitLabel="Registrar decisão" className="w-full max-w-sm space-y-2">
                  <input type="hidden" name="contestId" value={c.id} />
                  <select name="decision" className="field-input"><option value="accept">Aceitar (devolver reivindicação)</option><option value="reject">Recusar</option></select>
                  <textarea name="note" rows={2} required placeholder="Justificativa (enviada ao consultor)" className="field-input" />
                </ActionForm>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
