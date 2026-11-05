import Link from 'next/link';
import { Card, PageTitle, Table, Td } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { PREFERRED_DOMAINS } from '@/lib/integrations/ai/editorial-generator';
import { createAdminClient } from '@/lib/server/deps';

export default async function AdminFontesPage() {
  await requireAdmin('content');
  const { data } = await createAdminClient()
    .from('article_sources')
    .select('id, url, title, publisher, accessed_at, articles(id, title, status)')
    .order('created_at', { ascending: false })
    .limit(300);
  const rows = (data ?? []) as unknown as Array<{ id: string; url: string; title: string | null; publisher: string | null; accessed_at: string; articles: { id: string; title: string; status: string } | null }>;
  const domains = rows.reduce<Record<string, number>>((acc, r) => {
    try {
      const h = new URL(r.url).hostname.replace(/^www\./, '');
      acc[h] = (acc[h] ?? 0) + 1;
    } catch { /* url inválida */ }
    return acc;
  }, {});
  return (
    <>
      <PageTitle title="Fontes e referências" description="Todas as fontes citadas, com data de acesso. Priorize fontes oficiais e documentos originais." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Table headers={['Fonte', 'Publicador', 'Acesso', 'Artigo']} empty={rows.length === 0}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="max-w-sm whitespace-normal"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-navy-700 underline">{r.title ?? r.url}</a></Td>
              <Td>{r.publisher ?? '—'}</Td>
              <Td>{new Date(r.accessed_at).toLocaleDateString('pt-BR')}</Td>
              <Td className="max-w-xs whitespace-normal">{r.articles && <Link href={`/admin/blog/${r.articles.id}`} className="underline">{r.articles.title}</Link>}</Td>
            </tr>
          ))}
        </Table>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-bold">Domínios mais citados</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([d, n]) => (
                <li key={d} className="flex justify-between"><span className={PREFERRED_DOMAINS.some((p) => d.endsWith(p)) ? 'font-semibold text-brand-green-dark' : ''}>{d}</span><span>{n}</span></li>
              ))}
            </ul>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="font-bold">Fontes prioritárias</h2>
            <p className="mt-1 text-muted">Usadas na orientação da automação:</p>
            <ul className="mt-2 list-disc pl-5">{PREFERRED_DOMAINS.map((d) => <li key={d}>{d}</li>)}</ul>
            <p className="mt-2 text-muted">Inclua também páginas oficiais das administradoras quando o conteúdo tratar delas.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
