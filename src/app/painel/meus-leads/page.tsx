import Link from 'next/link';
import { Badge, PageTitle, Table, Td, formatDateTime } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';
import { ASSIGNMENT_STATUS } from '@/lib/labels';
import { formatRange } from '@/lib/domain/money';

interface Row {
  id: string;
  lead_id: string;
  status: string;
  claimed_at: string;
  contact_deadline: string;
  leads: { modality_id: string; city: string; state: string; credit_min_cents: number | null; credit_max_cents: number | null } | null;
}

export default async function MeusLeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase } = await requireConsultant();
  let q = supabase
    .from('lead_assignments')
    .select('id, lead_id, status, claimed_at, contact_deadline, leads(modality_id, city, state, credit_min_cents, credit_max_cents)')
    .order('claimed_at', { ascending: false })
    .limit(200);
  if (status && ASSIGNMENT_STATUS[status]) q = q.eq('status', status);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle title="Meus leads" description="Oportunidades atribuídas a você. Abra para ver o contato e atualizar o status." />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/painel/meus-leads" className={`rounded-full border px-3 py-1 ${!status ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white'}`}>Todos</Link>
        {Object.entries(ASSIGNMENT_STATUS).map(([k, v]) => (
          <Link key={k} href={`/painel/meus-leads?status=${k}`} className={`rounded-full border px-3 py-1 ${status === k ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white'}`}>{v}</Link>
        ))}
      </nav>
      <Table headers={['Oportunidade', 'Crédito', 'Status', 'Reivindicado em', 'Prazo de contato', '']} empty={rows.length === 0}>
        {rows.map((r) => {
          const late = r.status === 'active' && new Date(r.contact_deadline).getTime() - Date.now() < 4 * 3600_000;
          return (
            <tr key={r.id}>
              <Td><span className="font-medium capitalize">{r.leads?.modality_id}</span> · {r.leads?.city}/{r.leads?.state}</Td>
              <Td>{formatRange(r.leads?.credit_min_cents, r.leads?.credit_max_cents)}</Td>
              <Td><Badge tone={r.status === 'active' ? (late ? 'warn' : 'neutral') : r.status === 'converted' ? 'green' : 'neutral'}>{ASSIGNMENT_STATUS[r.status] ?? r.status}</Badge></Td>
              <Td>{formatDateTime(r.claimed_at)}</Td>
              <Td className={late ? 'font-semibold text-warn' : ''}>{r.status === 'active' ? formatDateTime(r.contact_deadline) : '—'}</Td>
              <Td><Link className="font-semibold text-navy-700 underline" href={`/painel/meus-leads/${r.lead_id}`}>Abrir</Link></Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
