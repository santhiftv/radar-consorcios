import Link from 'next/link';
import { saveOnboardingAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Card, PageTitle } from '@/components/ui';
import { consultantTerms } from '@/content/legal';
import { requireConsultant } from '@/lib/auth/guards';
import { UFS } from '@/lib/domain/validation';
import { getAdministrators, getModalities, getPlans, getRegions } from '@/lib/server/queries';

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams;
  const { user, supabase, profile } = await requireConsultant({ allowIncomplete: true });
  const [{ data: authUser }, regions, modalities, administrators, plans] = await Promise.all([
    supabase.auth.getUser(),
    getRegions(),
    getModalities(),
    getAdministrators(),
    getPlans(),
  ]);
  const meta = authUser.user?.user_metadata as { full_name?: string; intended_plan?: string } | undefined;
  const planCode = plano ?? profile?.intended_plan_code ?? meta?.intended_plan ?? '';
  const plan = plans.find((p) => p.code === planCode);
  const byState = regions.reduce<Record<string, typeof regions>>((acc, r) => ((acc[r.state] ??= []).push(r), acc), {});
  const allowedMods = modalities.filter((m) => !plan?.allowedModalities || plan.allowedModalities.includes(m.id));

  return (
    <>
      <PageTitle title="Complete seu perfil profissional" description={`Conta: ${user.email}. Depois deste passo você escolhe a forma de pagamento.`} />
      <ActionForm action={saveOnboardingAction} submitLabel="Salvar e continuar para o pagamento" className="space-y-6">
        <input type="hidden" name="plan" value={planCode} />
        <Card className="grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2"><label className="field-label" htmlFor="fullName">Nome completo</label><input id="fullName" name="fullName" required defaultValue={profile?.full_name ?? meta?.full_name ?? ''} className="field-input" /></div>
          <div><label className="field-label" htmlFor="phone">Telefone profissional</label><input id="phone" name="phone" required placeholder="(41) 99999-0000" defaultValue={profile?.professional_phone ?? ''} className="field-input" /></div>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div><label className="field-label" htmlFor="city">Cidade</label><input id="city" name="city" required defaultValue={profile?.city ?? ''} className="field-input" /></div>
            <div><label className="field-label" htmlFor="state">UF</label><select id="state" name="state" required defaultValue={profile?.state ?? ''} className="field-input"><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></div>
          </div>
          <div><label className="field-label" htmlFor="company">Empresa ou escritório (opcional)</label><input id="company" name="company" defaultValue={profile?.company ?? ''} className="field-input" /></div>
          <div><label className="field-label" htmlFor="professionalReference">Identificação profissional / vínculo (opcional)</label><input id="professionalReference" name="professionalReference" defaultValue={profile?.professional_reference ?? ''} className="field-input" /></div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">Regiões atendidas {plan?.maxRegions && <span className="text-sm font-normal text-muted">(plano {plan.name}: até {plan.maxRegions})</span>}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byState).map(([uf, list]) => (
              <fieldset key={uf} className="rounded-lg border border-line p-3">
                <legend className="px-1 text-sm font-semibold">{uf}</legend>
                {list.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 py-0.5 text-sm"><input type="checkbox" name="regionIds" value={r.id} className="accent-navy-900" />{r.label}</label>
                ))}
              </fieldset>
            ))}
          </div>
          <h2 className="mt-6 font-bold">Modalidades atendidas {plan?.maxModalities && <span className="text-sm font-normal text-muted">(escolha {plan.maxModalities})</span>}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedMods.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <input type={plan?.maxModalities === 1 ? 'radio' : 'checkbox'} name="modalities" value={m.id} className="accent-navy-900" />{m.name}
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">Administradoras com as quais pode trabalhar</h2>
          <p className="mt-1 text-sm text-muted">Ficam em verificação. Oportunidades com preferência por administradora exigem habilitação verificada.</p>
          <div className="mt-3 space-y-2">
            {administrators.map((a) => (
              <div key={a.id} className="grid items-center gap-2 sm:grid-cols-[220px_1fr]">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="administratorIds" value={a.id} className="accent-navy-900" />{a.name}</label>
                <input name={`evidence_${a.id}`} maxLength={500} placeholder="Como comprovar o vínculo (opcional)" className="field-input py-1.5 text-sm" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">Termos do Consultor (versão {consultantTerms.version})</h2>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-line bg-navy-50 p-4 text-sm">
            {consultantTerms.sections.map((s) => (
              <div key={s.heading} className="mb-3"><p className="font-semibold">{s.heading}</p>{s.paragraphs.map((p) => <p key={p.slice(0, 30)} className="mt-1 text-muted">{p}</p>)}</div>
            ))}
          </div>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 accent-brand-green" />
            <span>Li e aceito os Termos do Consultor, os <Link href="/termos" className="underline" target="_blank">Termos de Uso</Link> e a <Link href="/privacidade" className="underline" target="_blank">Política de Privacidade</Link>.</span>
          </label>
        </Card>
      </ActionForm>
    </>
  );
}
