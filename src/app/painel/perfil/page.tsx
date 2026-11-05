import Link from 'next/link';
import { declareEligibilityAction, updateProfileAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Badge, Card, PageTitle } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';
import { VERIFICATION_STATUS } from '@/lib/labels';
import { UFS, formatPhoneBR } from '@/lib/domain/validation';
import { getAdministrators, rows } from '@/lib/server/queries';

export default async function PerfilPage() {
  const { user, supabase, profile } = await requireConsultant();
  const [{ data: elig }, administrators] = await Promise.all([
    supabase.from('administrator_eligibility').select('administrator_id, status, evidence_note, administrators(name)'),
    getAdministrators(),
  ]);
  const declared = new Set((elig ?? []).map((e: { administrator_id: string }) => e.administrator_id));

  return (
    <>
      <PageTitle title="Perfil e segurança" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Dados profissionais</h2>
            <Badge tone={profile?.verification_status === 'verified' ? 'green' : 'neutral'}>{VERIFICATION_STATUS[profile?.verification_status ?? 'pending']}</Badge>
          </div>
          <ActionForm action={updateProfileAction} submitLabel="Salvar" className="mt-4 space-y-3">
            <div><label className="field-label" htmlFor="fullName">Nome completo</label><input id="fullName" name="fullName" defaultValue={profile?.full_name} className="field-input" required /></div>
            <div><label className="field-label" htmlFor="phone">Telefone profissional</label><input id="phone" name="phone" defaultValue={formatPhoneBR(profile?.professional_phone)} className="field-input" required /></div>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <div><label className="field-label" htmlFor="city">Cidade</label><input id="city" name="city" defaultValue={profile?.city} className="field-input" required /></div>
              <div><label className="field-label" htmlFor="state">UF</label>
                <select id="state" name="state" defaultValue={profile?.state} className="field-input">{UFS.map((u) => <option key={u}>{u}</option>)}</select>
              </div>
            </div>
            <div><label className="field-label" htmlFor="company">Empresa ou escritório (opcional)</label><input id="company" name="company" defaultValue={profile?.company ?? ''} className="field-input" /></div>
            <div><label className="field-label" htmlFor="professionalReference">Identificação profissional ou vínculo comercial (opcional)</label><input id="professionalReference" name="professionalReference" defaultValue={profile?.professional_reference ?? ''} className="field-input" /></div>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold">Administradoras com que trabalho</h2>
            <p className="mt-1 text-sm text-muted">Declarações ficam em verificação pela equipe. Não solicitamos documentos além do necessário.</p>
            <ul className="mt-4 divide-y divide-line text-sm">
              {(elig ?? []).length === 0 && <li className="py-2 text-muted">Nenhuma declarada.</li>}
              {rows<{ administrator_id: string; status: string; administrators: { name: string } | null }>(elig).map((e) => (
                <li key={e.administrator_id} className="flex items-center justify-between py-2">
                  {e.administrators?.name}
                  <Badge tone={e.status === 'verified' ? 'green' : e.status === 'pending' ? 'neutral' : 'danger'}>{VERIFICATION_STATUS[e.status]}</Badge>
                </li>
              ))}
            </ul>
            <ActionForm action={declareEligibilityAction} submitLabel="Declarar" submitVariant="secondary" className="mt-4 space-y-3" resetOnSuccess>
              <select name="administratorId" className="field-input" defaultValue="" required>
                <option value="" disabled>Selecione a administradora</option>
                {administrators.filter((a) => !declared.has(a.id)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input name="evidence" maxLength={500} placeholder="Como comprovar o vínculo (ex.: código de credenciado)" className="field-input" />
            </ActionForm>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-bold">Segurança</h2>
            <p className="mt-2 text-sm">E-mail de acesso: <strong>{user.email}</strong></p>
            <Link href="/recuperar-senha" className="mt-3 inline-block text-sm font-semibold text-navy-700 underline">Alterar senha</Link>
            <p className="mt-4 text-xs text-muted">Não compartilhe seu acesso. Contas compartilhadas ou automatizadas são suspensas (Termos do Consultor).</p>
          </Card>
        </div>
      </div>
    </>
  );
}
