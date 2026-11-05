import { Badge, PageTitle, Table, Td, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/server/deps';

const TABLES = ['plans', 'app_settings', 'platform_admins', 'consultant_profiles', 'administrator_eligibility', 'subscriptions', 'leads', 'lead_assignments', 'lead_contests', 'privacy_requests', 'articles', 'administrators', 'modalities', 'regions'];

export default async function AdminAuditoriaPage({ searchParams }: { searchParams: Promise<{ tabela?: string; ator?: string }> }) {
  const { tabela, ator } = await searchParams;
  await requireAdmin('audit');
  let q = createAdminClient().from('audit_logs').select('id, actor_id, actor_kind, action, table_name, record_id, old_data, new_data, created_at').order('id', { ascending: false }).limit(200);
  if (tabela) q = q.eq('table_name', tabela);
  if (ator && /^[0-9a-f-]{36}$/i.test(ator)) q = q.eq('actor_id', ator);
  const { data } = await q;
  return (
    <>
      <PageTitle title="Logs e auditoria" description="Registros imutáveis (nem administradores conseguem alterá-los). Dados pessoais são omitidos." />
      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <select name="tabela" defaultValue={tabela ?? ''} className="field-input w-56"><option value="">Todas as tabelas</option>{TABLES.map((t) => <option key={t}>{t}</option>)}<option>system</option><option>leads</option></select>
        <input name="ator" defaultValue={ator ?? ''} placeholder="ID do ator" className="field-input w-80" />
        <button className="rounded-lg bg-navy-900 px-4 text-white">Filtrar</button>
      </form>
      <Table headers={['Quando', 'Ator', 'Ação', 'Tabela', 'Registro', 'Alterações']} empty={(data ?? []).length === 0}>
        {(data ?? []).map((l: { id: number; actor_id: string | null; actor_kind: string; action: string; table_name: string; record_id: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string }) => {
          const changed = l.old_data && l.new_data
            ? Object.keys(l.new_data).filter((k) => JSON.stringify(l.new_data![k]) !== JSON.stringify(l.old_data![k]) && k !== 'updated_at')
            : [];
          return (
            <tr key={l.id}>
              <Td>{formatDateTime(l.created_at)}</Td>
              <Td><Badge tone={l.actor_kind === 'admin' ? 'navy' : 'neutral'}>{l.actor_kind}</Badge><div className="font-mono text-[10px] text-muted">{l.actor_id?.slice(0, 8)}</div></Td>
              <Td>{l.action}</Td>
              <Td>{l.table_name}</Td>
              <Td className="font-mono text-xs">{l.record_id?.slice(0, 12)}</Td>
              <Td className="max-w-md whitespace-normal text-xs">
                {changed.length > 0
                  ? changed.map((k) => <div key={k}><strong>{k}</strong>: {JSON.stringify(l.old_data![k])} → {JSON.stringify(l.new_data![k])}</div>)
                  : l.new_data && !l.old_data ? <span className="text-muted">criação</span> : l.action === 'DELETE' ? <span className="text-muted">remoção</span> : <span className="text-muted">{l.new_data ? JSON.stringify(l.new_data).slice(0, 120) : '—'}</span>}
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
