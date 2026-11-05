import Link from 'next/link';
import { editorialScheduleAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Badge, ButtonLink, Card, PageTitle, Table, Td, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { CATEGORY_LABELS, type ArticleCategory } from '@/lib/domain/editorial';
import { createAdminClient } from '@/lib/server/deps';
import { integrationStatus } from '@/lib/server/env';

const ART_STATUS: Record<string, string> = { draft: 'Rascunho', in_review: 'Em revisão', approved: 'Aprovado', published: 'Publicado', archived: 'Arquivado', rejected: 'Rejeitado' };
const JOB_STATUS: Record<string, string> = { queued: 'Na fila', running: 'Gerando', drafted: 'Rascunho pronto', failed: 'Falhou', skipped: 'Pulado' };

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  await requireAdmin('content');
  const db = createAdminClient();
  let q = db.from('articles').select('id, slug, title, category, status, published_at, scheduled_for, flags, similarity_max, updated_at').order('updated_at', { ascending: false }).limit(100);
  if (status && ART_STATUS[status]) q = q.eq('status', status);
  const [{ data: articles }, { data: jobs }] = await Promise.all([
    q,
    db.from('editorial_jobs').select('id, slot_date, category, topic, status, attempts, error, article_id, fallback_applied').order('slot_date', { ascending: false }).limit(16),
  ]);
  const ai = integrationStatus().find((i) => i.name.startsWith('IA'));

  return (
    <>
      <PageTitle title="Blog e fila editorial" description="A automação prepara rascunhos com fontes; a publicação exige revisão humana." actions={<ButtonLink href="/admin/blog/novo" variant="navy" size="sm">Novo artigo</ButtonLink>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <nav className="mb-3 flex flex-wrap gap-2 text-sm">
            <Link href="/admin/blog" className={`rounded-full border px-3 py-1 ${!status ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white'}`}>Todos</Link>
            {Object.entries(ART_STATUS).map(([k, v]) => <Link key={k} href={`/admin/blog?status=${k}`} className={`rounded-full border px-3 py-1 ${status === k ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white'}`}>{v}</Link>)}
          </nav>
          <Table headers={['Título', 'Categoria', 'Status', 'Alertas', 'Atualizado']} empty={(articles ?? []).length === 0}>
            {(articles ?? []).map((a: { id: string; title: string; category: string; status: string; flags: unknown[]; similarity_max: number | null; updated_at: string; published_at: string | null }) => (
              <tr key={a.id}>
                <Td className="max-w-md whitespace-normal"><Link href={`/admin/blog/${a.id}`} className="font-medium text-navy-700 underline">{a.title}</Link></Td>
                <Td>{CATEGORY_LABELS[a.category as ArticleCategory]}</Td>
                <Td><Badge tone={a.status === 'published' ? 'green' : a.status === 'in_review' ? 'warn' : 'neutral'}>{ART_STATUS[a.status]}</Badge></Td>
                <Td>{a.flags.length > 0 ? <Badge tone="warn">{a.flags.length}</Badge> : '—'}{a.similarity_max != null && a.similarity_max >= 0.35 && <span className="ml-1 text-xs text-warn">sim. {a.similarity_max}</span>}</Td>
                <Td>{formatDateTime(a.updated_at)}</Td>
              </tr>
            ))}
          </Table>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-bold">Automação (4 artigos/semana)</h2>
            <p className="mt-1 text-sm text-muted">Provedor de IA: {ai?.ok ? 'configurado' : 'não configurado — jobs serão pulados e o editor escreve manualmente'}.</p>
            <p className="mt-1 text-xs text-muted">Calendário e pautas sugeridas: Configurações → editorial_calendar / editorial_topics_backlog.</p>
            <ActionForm action={editorialScheduleAction} submitLabel="Criar pautas da próxima semana" submitVariant="secondary" className="mt-3 space-y-2" />
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Fila editorial</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(jobs ?? []).length === 0 && <li className="text-muted">Nenhuma pauta.</li>}
              {(jobs ?? []).map((j: { id: string; slot_date: string; category: string; topic: string | null; status: string; attempts: number; error: string | null; article_id: string | null; fallback_applied: boolean }) => (
                <li key={j.id} className="rounded-lg bg-navy-50 p-2">
                  <div className="flex justify-between"><span>{new Date(`${j.slot_date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {CATEGORY_LABELS[j.category as ArticleCategory]}</span><Badge tone={j.status === 'drafted' ? 'green' : j.status === 'failed' ? 'danger' : 'neutral'}>{JOB_STATUS[j.status]}</Badge></div>
                  {j.topic && <p className="text-xs">Pauta: {j.topic}</p>}
                  {j.fallback_applied && <p className="text-xs text-warn">Notícia sem fontes suficientes → guia educativo</p>}
                  {j.error && <p className="text-xs text-danger">{j.error}</p>}
                  {j.article_id && <Link href={`/admin/blog/${j.article_id}`} className="text-xs underline">Revisar rascunho</Link>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
