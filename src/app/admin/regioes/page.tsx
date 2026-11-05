import { saveRegionAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Card, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { UFS } from '@/lib/domain/validation';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminRegioesPage({ searchParams }: { searchParams: Promise<{ uf?: string }> }) {
  const { uf } = await searchParams;
  await requireAdmin('catalog');
  let q = createAdminClient().from('regions').select('id, state, city, label, active').order('state').order('label').limit(500);
  if (uf && (UFS as readonly string[]).includes(uf)) q = q.eq('state', uf);
  const { data } = await q;
  return (
    <>
      <PageTitle title="Regiões" description="Cidades criadas automaticamente a partir dos pedidos aparecem aqui. Região sem cidade = estado inteiro." />
      <Card className="mb-5 p-5">
        <h2 className="font-bold">Nova região</h2>
        <ActionForm action={saveRegionAction} submitLabel="Adicionar" className="mt-3 grid gap-2 sm:grid-cols-[100px_1fr_1fr_auto_auto] sm:items-center" resetOnSuccess>
          <select name="state" className="field-input" required>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
          <input name="city" placeholder="Cidade (vazio = estado inteiro)" className="field-input" />
          <input name="label" placeholder="Rótulo (opcional)" className="field-input" />
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="active" defaultChecked /> Ativa</label>
        </ActionForm>
      </Card>
      <form className="mb-3 flex gap-2 text-sm"><select name="uf" defaultValue={uf ?? ''} className="field-input w-32"><option value="">Todas UFs</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select><button className="rounded-lg bg-navy-900 px-4 text-white">Filtrar</button></form>
      <Card className="space-y-2 p-5">
        {(data ?? []).map((r: { id: string; state: string; city: string | null; label: string; active: boolean }) => (
          <ActionForm key={r.id} action={saveRegionAction} submitLabel="Salvar" submitVariant="secondary" className="grid gap-2 sm:grid-cols-[80px_1fr_1fr_auto_auto] sm:items-center">
            <input type="hidden" name="id" value={r.id} />
            <input name="state" defaultValue={r.state} readOnly className="field-input text-sm" />
            <input name="city" defaultValue={r.city ?? ''} className="field-input text-sm" />
            <input name="label" defaultValue={r.label} className="field-input text-sm" />
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="active" defaultChecked={r.active} /> Ativa</label>
          </ActionForm>
        ))}
      </Card>
    </>
  );
}
