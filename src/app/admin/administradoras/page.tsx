import { saveAdministratorAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Alert, Card, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminAdministradorasPage() {
  await requireAdmin('catalog');
  const { data } = await createAdminClient().from('administrators').select('*').order('name');
  return (
    <>
      <PageTitle title="Administradoras" description="Lista de administradoras de consórcio exibidas como opção no formulário e nos filtros." />
      <Alert tone="warn" className="mb-4">Cadastrar uma administradora não significa parceria. Não use logotipos ou selos sem autorização formal.</Alert>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold">Nova administradora</h2>
          <ActionForm action={saveAdministratorAction} submitLabel="Adicionar" className="mt-3 space-y-3" resetOnSuccess>
            <input name="name" required placeholder="Nome" className="field-input" />
            <input name="slug" placeholder="slug (opcional)" className="field-input" />
            <textarea name="notes" rows={2} placeholder="Observações internas" className="field-input" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresVerification" defaultChecked /> Exige habilitação verificada do consultor</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Ativa</label>
          </ActionForm>
        </Card>
        {(data ?? []).map((a: { id: string; name: string; slug: string; requires_verification: boolean; active: boolean; notes: string | null }) => (
          <Card key={a.id} className="p-5">
            <ActionForm action={saveAdministratorAction} submitLabel="Salvar" submitVariant="secondary" className="space-y-3">
              <input type="hidden" name="id" value={a.id} />
              <input name="name" defaultValue={a.name} className="field-input font-semibold" />
              <input name="slug" defaultValue={a.slug} className="field-input text-sm" />
              <textarea name="notes" rows={2} defaultValue={a.notes ?? ''} className="field-input text-sm" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresVerification" defaultChecked={a.requires_verification} /> Exige habilitação verificada</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={a.active} /> Ativa</label>
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
