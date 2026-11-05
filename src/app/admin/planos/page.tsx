import { savePlanAction } from './actions';
import { ActionForm } from '@/components/panel/action-form';
import { Alert, Card, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/server/deps';

const FILTERS: ReadonlyArray<readonly [string, string]> = [['credit', 'Crédito'], ['installment', 'Parcela'], ['term', 'Prazo'], ['region', 'Região'], ['administrator', 'Administradora']];

export default async function AdminPlanosPage() {
  await requireAdmin('plans');
  const { data } = await createAdminClient().from('plans').select('*').order('sort_order');
  return (
    <>
      <PageTitle title="Planos e limites" description="Preços, limites e prioridade. Toda alteração é auditada." />
      <Alert tone="warn" className="mb-4">Mudanças de preço/limite valem para novos assinantes imediatamente e para assinantes atuais a partir da próxima renovação. Comunique com antecedência e mantenha a página de planos coerente.</Alert>
      <div className="grid gap-5 xl:grid-cols-3">
        {(data ?? []).map((p: { id: string; code: string; name: string; price_cents: number; claim_limit: number; claims_unlimited: boolean; max_lead_urgency: number; max_regions: number | null; priority_delay_seconds: number; allowed_filters: string[]; features: string[]; active: boolean; provider_plan_id: string | null }) => (
          <Card key={p.id} className="p-5">
            <h2 className="font-bold">{p.name} <span className="text-xs font-normal text-muted">({p.code})</span></h2>
            <ActionForm action={savePlanAction} submitLabel="Salvar plano" className="mt-4 space-y-3">
              <input type="hidden" name="id" value={p.id} />
              <div><label className="field-label">Nome</label><input name="name" defaultValue={p.name} className="field-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="field-label">Preço mensal (R$)</label><input name="price" defaultValue={(p.price_cents / 100).toFixed(2)} className="field-input" /></div>
                <div><label className="field-label">Limite/ciclo (ignorado se sem limite)</label><input name="claimLimit" type="number" min={0} defaultValue={p.claim_limit} className="field-input" /></div>
                <div><label className="field-label">Máx. regiões</label><input name="maxRegions" type="number" min={1} defaultValue={p.max_regions ?? ''} placeholder="ilimitado" className="field-input" /></div>
                <div><label className="field-label">Atraso de prioridade (s)</label><input name="priorityDelaySeconds" type="number" min={0} defaultValue={p.priority_delay_seconds} className="field-input" /></div>
                <div><label className="field-label">Urgência máx. recebida (0–10)</label><input name="maxLeadUrgency" type="number" min={0} max={10} defaultValue={p.max_lead_urgency} className="field-input" /></div>
                <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="claimsUnlimited" defaultChecked={p.claims_unlimited} /> Sem limite de leads</label>
              </div>
              <fieldset><legend className="field-label">Filtros incluídos</legend>
                <div className="flex flex-wrap gap-2">{FILTERS.map(([k, l]) => <label key={k} className="flex items-center gap-1 text-sm"><input type="checkbox" name="allowedFilters" value={k} defaultChecked={p.allowed_filters.includes(k)} />{l}</label>)}</div>
              </fieldset>
              <div><label className="field-label">Benefícios (um por linha)</label><textarea name="features" rows={6} defaultValue={(p.features ?? []).join('\n')} className="field-input text-sm" /></div>
              <div><label className="field-label">ID de plano no provedor (opcional)</label><input name="providerPlanId" defaultValue={p.provider_plan_id ?? ''} className="field-input" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.active} /> Ativo (visível para novas assinaturas)</label>
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
