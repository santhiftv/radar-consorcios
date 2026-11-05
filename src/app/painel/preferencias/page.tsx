import { savePreferencesAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Alert, Card, PageTitle } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';
import { CREDIT_BANDS, INSTALLMENT_BANDS, TERM_OPTIONS } from '@/lib/domain/bands';
import { getAdministrators, getModalities, getPlans, getRegions } from '@/lib/server/queries';

export default async function PreferenciasPage() {
  const { user, supabase, profile } = await requireConsultant();
  const [{ data: pref }, { data: usage }, regions, modalities, administrators, plans] = await Promise.all([
    supabase.from('lead_preferences').select('*').eq('consultant_id', user.id).maybeSingle(),
    supabase.rpc('consultant_usage'),
    getRegions(),
    getModalities(),
    getAdministrators(),
    getPlans(),
  ]);
  const u = (usage ?? {}) as { plan_code?: string };
  const plan = plans.find((p) => p.code === (u.plan_code ?? profile?.intended_plan_code)) ?? plans[0];
  const has = (f: string) => plan?.allowedFilters.includes(f as never) ?? false;
  const p = (pref ?? {}) as {
    region_ids?: string[]; modalities?: string[]; credit_min_cents?: number | null; credit_max_cents?: number | null;
    installment_min_cents?: number | null; installment_max_cents?: number | null; term_min_months?: number | null; term_max_months?: number | null;
    administrator_ids?: string[]; notify_email?: boolean; notify_inapp?: boolean; quiet_hours_start?: string | null; quiet_hours_end?: string | null;
  };
  const byState = regions.reduce<Record<string, typeof regions>>((acc, r) => ((acc[r.state] ??= []).push(r), acc), {});
  const creditMinBand = CREDIT_BANDS.find((b) => (b.minCents ?? 0) === p.credit_min_cents)?.id ?? '';
  const creditMaxBand = CREDIT_BANDS.find((b) => b.maxCents === p.credit_max_cents)?.id ?? '';
  const instMinBand = INSTALLMENT_BANDS.find((b) => (b.minCents ?? 0) === p.installment_min_cents)?.id ?? '';
  const instMaxBand = INSTALLMENT_BANDS.find((b) => b.maxCents === p.installment_max_cents)?.id ?? '';
  const allowedModalities = modalities.filter((m) => !plan?.allowedModalities || plan.allowedModalities.includes(m.id));

  return (
    <>
      <PageTitle title="Filtros e preferências" description={`Limites do plano ${plan?.name ?? ''}: ${plan?.maxRegions ? `até ${plan.maxRegions} região(ões)` : 'múltiplas regiões'}, ${plan?.maxModalities ? `${plan.maxModalities} modalidade` : 'todas as modalidades'}.`} />
      <Alert tone="neutral" className="mb-4">Filtros não incluídos no seu plano aparecem desativados. O servidor também valida esses limites.</Alert>
      <ActionForm action={savePreferencesAction} submitLabel="Salvar preferências" className="space-y-6">
        <Card className="p-5">
          <h2 className="font-bold">Regiões de atendimento</h2>
          <p className="mt-1 text-sm text-muted">Selecione cidades ou o estado inteiro. Não encontrou sua cidade? Peça ao suporte para cadastrá-la.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byState).map(([uf, list]) => (
              <fieldset key={uf} className="rounded-lg border border-line p-3">
                <legend className="px-1 text-sm font-semibold">{uf}</legend>
                {list.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 py-0.5 text-sm">
                    <input type="checkbox" name="regionIds" value={r.id} defaultChecked={p.region_ids?.includes(r.id)} className="accent-navy-900" />
                    {r.label}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">Modalidades</h2>
          <p className="mt-1 text-sm text-muted">{plan?.maxModalities ? `Escolha ${plan.maxModalities}.` : 'Deixe todas desmarcadas para receber todas as modalidades.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedModalities.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <input type={plan?.maxModalities === 1 ? 'radio' : 'checkbox'} name="modalities" value={m.id} defaultChecked={p.modalities?.includes(m.id)} className="accent-navy-900" />
                {m.name}
              </label>
            ))}
          </div>
        </Card>

        <Card className="grid gap-5 p-5 md:grid-cols-2">
          <fieldset disabled={!has('credit')} className="disabled:opacity-50">
            <legend className="font-bold">Faixa de crédito {!has('credit') && <span className="text-xs font-normal">(não incluso)</span>}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select name="creditBand" defaultValue={creditMinBand} className="field-input" aria-label="Crédito a partir de">
                <option value="">Sem mínimo</option>
                {CREDIT_BANDS.map((b) => <option key={b.id} value={b.id}>a partir de {b.label}</option>)}
              </select>
              <select name="creditBandMax" defaultValue={creditMaxBand} className="field-input" aria-label="Crédito até">
                <option value="">Sem máximo</option>
                {CREDIT_BANDS.filter((b) => b.maxCents).map((b) => <option key={b.id} value={b.id}>até {b.label}</option>)}
              </select>
            </div>
          </fieldset>
          <fieldset disabled={!has('installment')} className="disabled:opacity-50">
            <legend className="font-bold">Faixa de parcela {!has('installment') && <span className="text-xs font-normal">(não incluso)</span>}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select name="installmentBand" defaultValue={instMinBand} className="field-input" aria-label="Parcela a partir de">
                <option value="">Sem mínimo</option>
                {INSTALLMENT_BANDS.map((b) => <option key={b.id} value={b.id}>a partir de {b.label}</option>)}
              </select>
              <select name="installmentBandMax" defaultValue={instMaxBand} className="field-input" aria-label="Parcela até">
                <option value="">Sem máximo</option>
                {INSTALLMENT_BANDS.filter((b) => b.maxCents).map((b) => <option key={b.id} value={b.id}>até {b.label}</option>)}
              </select>
            </div>
          </fieldset>
          <fieldset disabled={!has('term')} className="disabled:opacity-50">
            <legend className="font-bold">Prazo {!has('term') && <span className="text-xs font-normal">(não incluso)</span>}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select name="termMin" defaultValue={p.term_min_months ?? ''} className="field-input" aria-label="Prazo mínimo">
                <option value="">Sem mínimo</option>
                {TERM_OPTIONS.map((t) => <option key={t} value={t}>de {t} meses</option>)}
              </select>
              <select name="termMax" defaultValue={p.term_max_months ?? ''} className="field-input" aria-label="Prazo máximo">
                <option value="">Sem máximo</option>
                {TERM_OPTIONS.map((t) => <option key={t} value={t}>até {t} meses</option>)}
              </select>
            </div>
          </fieldset>
          <fieldset disabled={!has('administrator')} className="disabled:opacity-50">
            <legend className="font-bold">Somente estas administradoras {!has('administrator') && <span className="text-xs font-normal">(não incluso)</span>}</legend>
            <p className="text-xs text-muted">Vale para leads com administradora preferida. Habilitação verificada continua necessária.</p>
            <div className="mt-2 space-y-1">
              {administrators.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="administratorFilter" value={a.id} defaultChecked={p.administrator_ids?.includes(a.id)} className="accent-navy-900" />
                  {a.name}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card className="grid gap-5 p-5 md:grid-cols-2">
          <fieldset>
            <legend className="font-bold">Canais de notificação</legend>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="notifyInapp" defaultChecked={p.notify_inapp ?? true} className="accent-navy-900" /> Painel em tempo real</label>
            <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" name="notifyEmail" defaultChecked={p.notify_email ?? true} className="accent-navy-900" /> E-mail</label>
          </fieldset>
          <fieldset>
            <legend className="font-bold">Horário de silêncio para e-mails</legend>
            <p className="text-xs text-muted">E-mails nesse intervalo são enviados ao final dele (horário de Brasília). O painel continua atualizando.</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <input type="time" name="quietStart" defaultValue={p.quiet_hours_start?.slice(0, 5) ?? ''} className="field-input w-32" aria-label="Início" />
              até
              <input type="time" name="quietEnd" defaultValue={p.quiet_hours_end?.slice(0, 5) ?? ''} className="field-input w-32" aria-label="Fim" />
            </div>
          </fieldset>
        </Card>
      </ActionForm>
    </>
  );
}
