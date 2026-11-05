import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publishArticleAction, saveArticleAction, setArticleStatusAction } from '../../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Alert, Badge, Card, PageTitle, formatDateTime } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/guards';
import { ARTICLE_CATEGORIES, CATEGORY_LABELS, validateDraft, type EditorialFlag } from '@/lib/domain/editorial';
import { renderMarkdown } from '@/lib/domain/markdown';
import { isUuid } from '@/lib/domain/validation';
import { createAdminClient } from '@/lib/server/deps';

export default async function ArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'novo';
  if (!isNew && !isUuid(id)) notFound();
  await requireAdmin('content');
  const db = createAdminClient();
  const { data: a } = isNew
    ? { data: null }
    : await db.from('articles').select('*, article_sources(url, title, publisher, accessed_at)').eq('id', id).maybeSingle();
  if (!isNew && !a) notFound();

  const sources = (a?.article_sources ?? []) as Array<{ url: string; title: string | null; publisher: string | null }>;
  const storedFlags = (a?.flags ?? []) as EditorialFlag[];
  const live = a ? validateDraft({ title: a.title, summary: a.summary, content_md: a.content_md, meta_description: a.meta_description ?? '', category: a.category, tags: a.tags, sources: sources.map((s) => ({ url: s.url, title: s.title ?? undefined, publisher: s.publisher ?? undefined })) }) : null;
  const preview = a ? renderMarkdown(a.content_md).html : '';

  return (
    <>
      <Link href="/admin/blog" className="text-sm text-navy-700 underline">← Blog</Link>
      <PageTitle title={isNew ? 'Novo artigo' : a!.title} description={a ? `Status: ${a.status} · atualizado ${formatDateTime(a.updated_at)}` : 'Artigos novos entram em revisão.'} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="p-5">
          <ActionForm action={saveArticleAction} submitLabel="Salvar" className="space-y-3">
            {a && <input type="hidden" name="id" value={a.id} />}
            <div><label className="field-label">Título</label><input name="title" required defaultValue={a?.title} className="field-input" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="field-label">Slug</label><input name="slug" defaultValue={a?.slug} className="field-input" /></div>
              <div><label className="field-label">Categoria</label><select name="category" defaultValue={a?.category ?? 'educacao'} className="field-input">{ARTICLE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></div>
            </div>
            <div><label className="field-label">Resumo</label><textarea name="summary" rows={2} defaultValue={a?.summary} className="field-input" /></div>
            <div><label className="field-label">Metadescrição (até 160)</label><input name="metaDescription" maxLength={170} defaultValue={a?.meta_description ?? ''} className="field-input" /></div>
            <div><label className="field-label">Conteúdo (Markdown; use [1], [2] para citar fontes)</label><textarea name="content" rows={22} defaultValue={a?.content_md} className="field-input font-mono text-sm" /></div>
            <div><label className="field-label">Fontes — uma por linha: URL | título | publicador</label><textarea name="sources" rows={5} defaultValue={sources.map((s) => [s.url, s.title, s.publisher].filter(Boolean).join(' | ')).join('\n')} className="field-input font-mono text-xs" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="field-label">Tags (vírgula)</label><input name="tags" defaultValue={(a?.tags ?? []).join(', ')} className="field-input" /></div>
              <div><label className="field-label">Autor</label><input name="authorName" defaultValue={a?.author_name ?? 'Equipe editorial'} className="field-input" /></div>
              <div><label className="field-label">Imagem de capa (URL https)</label><input name="coverImageUrl" defaultValue={a?.cover_image_url ?? ''} className="field-input" /></div>
              <div><label className="field-label">Texto alternativo da imagem</label><input name="coverImageAlt" defaultValue={a?.cover_image_alt ?? ''} className="field-input" /></div>
            </div>
          </ActionForm>
        </Card>

        {a && (
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="font-bold">Validação editorial</h2>
              {live && live.errors.length > 0 && <Alert tone="danger" className="mt-3">{live.errors.join(' ')}</Alert>}
              <ul className="mt-3 space-y-2 text-sm">
                {[...storedFlags, ...(live?.flags ?? [])].length === 0 && <li className="text-muted">Nenhum alerta.</li>}
                {[...storedFlags, ...(live?.flags ?? [])].slice(0, 30).map((f, i) => (
                  <li key={i} className="rounded-lg bg-warn-soft p-2"><Badge tone="warn">{f.type}</Badge> {f.message}{f.excerpt && <span className="block text-xs text-muted">“{f.excerpt}”</span>}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Confirme valores, taxas, prazos e datas nas fontes. Não publique notícias, taxas ou regras sem verificação.</p>
            </Card>
            {a.status !== 'published' && (
              <Card className="p-5">
                <h2 className="font-bold">Publicar</h2>
                <ActionForm action={publishArticleAction} submitLabel="Aprovar e publicar" submitVariant="green" className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={a.id} />
                  <input name="reviewerName" required placeholder="Nome do revisor responsável" className="field-input" />
                  <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="ackFlags" className="mt-0.5" /> Revisei os alertas, verifiquei as fontes e confirmo que não há promessas indevidas.</label>
                </ActionForm>
              </Card>
            )}
            <Card className="p-5">
              <h2 className="font-bold">Outras ações</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.status !== 'rejected' && a.status !== 'published' && (
                  <ActionForm action={setArticleStatusAction} submitLabel="Rejeitar" submitVariant="secondary"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="rejected" /></ActionForm>
                )}
                {a.status === 'published' && (
                  <ActionForm action={setArticleStatusAction} submitLabel="Despublicar (arquivar)" submitVariant="danger"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="archived" /></ActionForm>
                )}
                {a.status === 'published' && <Link href={`/blog/${a.slug}`} target="_blank" className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold">Ver no site</Link>}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-bold">Pré-visualização</h2>
              <div className="prose-article mt-3 max-h-[600px] overflow-y-auto text-[15px]" dangerouslySetInnerHTML={{ __html: preview }} />
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
