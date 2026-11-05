import { saveModalityAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Card, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminModalidadesPage() {
  await requireAdmin('catalog');
  const { data } = await createAdminClient().from('modalities').select('*').order('sort_order');
  const Form = ({ m }: { m?: { id: string; name: string; description: string | null; active: boolean; sort_order: number } }) => (
    <ActionForm action={saveModalityAction} submitLabel={m ? 'Salvar' : 'Adicionar'} submitVariant={m ? 'secondary' : 'navy'} className="grid gap-2 sm:grid-cols-[140px_1fr_1.5fr_80px_auto_auto] sm:items-center">
      <input name="id" defaultValue={m?.id} readOnly={!!m} required placeholder="identificador" className="field-input text-sm" />
      <input name="name" defaultValue={m?.name} required placeholder="Nome" className="field-input text-sm" />
      <input name="description" defaultValue={m?.description ?? ''} placeholder="Descrição" className="field-input text-sm" />
      <input name="sortOrder" type="number" defaultValue={m?.sort_order ?? 100} className="field-input text-sm" />
      <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="active" defaultChecked={m?.active ?? true} /> Ativa</label>
    </ActionForm>
  );
  return (
    <>
      <PageTitle title="Modalidades" description="Modalidades exibidas no simulador, formulário e filtros. Desative em vez de excluir (preserva histórico)." />
      <Card className="space-y-3 p-5">
        {(data ?? []).map((m) => <Form key={m.id} m={m} />)}
        <div className="border-t border-line pt-3"><Form /></div>
      </Card>
    </>
  );
}
