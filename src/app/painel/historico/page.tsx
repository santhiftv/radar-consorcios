import { Badge, PageTitle, Table, Td, formatDateTime } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';
import { CLAIM_RESULT } from '@/lib/labels';

export default async function HistoricoPage() {
  const { supabase } = await requireConsultant();
  const { data } = await supabase
    .from('lead_claim_attempts')
    .select('id, lead_id, result, attempted_at')
    .order('attempted_at', { ascending: false })
    .limit(300);
  const rows = (data ?? []) as Array<{ id: number; lead_id: string | null; result: string; attempted_at: string }>;
  return (
    <>
      <PageTitle title="Histórico de reivindicações" description="Todas as suas tentativas, com o resultado registrado pelo servidor." />
      <Table headers={['Data e hora', 'Oportunidade', 'Resultado']} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>{formatDateTime(r.attempted_at)}</Td>
            <Td className="font-mono text-xs">{r.lead_id ? r.lead_id.slice(0, 8) : '—'}</Td>
            <Td><Badge tone={r.result === 'won' ? 'green' : r.result === 'already_taken' ? 'neutral' : 'warn'}>{CLAIM_RESULT[r.result] ?? r.result}</Badge></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
