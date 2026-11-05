import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCardView, Disclaimers, JsonLd } from '@/components/content-blocks';
import { LeadForm } from '@/components/lead-form';
import { Badge, ButtonLink, Card, formatDate } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { CATEGORY_LABELS, type ArticleCategory } from '@/lib/domain/editorial';
import { excerpt, renderMarkdown } from '@/lib/domain/markdown';
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd } from '@/lib/domain/seo';
import { getAdministrators, getAllPublishedSlugs, getArticleBySlug, getModalities, getRelatedArticles } from '@/lib/server/queries';

export const revalidate = 600;

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.slice(0, 200).map((s) => ({ slug: s.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) return { title: 'Artigo não encontrado', robots: { index: false } };
  const description = a.meta_description || a.summary || excerpt(a.content_md);
  return {
    title: a.title,
    description,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: {
      type: 'article',
      title: a.title,
      description,
      url: `/blog/${a.slug}`,
      publishedTime: a.published_at,
      modifiedTime: a.content_updated_at ?? a.published_at,
      images: a.cover_image_url ? [{ url: a.cover_image_url, alt: a.cover_image_alt ?? a.title }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) notFound();
  const [related, modalities, administrators] = await Promise.all([getRelatedArticles(a), getModalities(), getAdministrators()]);
  const { html, headings } = renderMarkdown(a.content_md);
  const url = absoluteUrl(siteConfig.url, `/blog/${a.slug}`);
  const category = CATEGORY_LABELS[a.category as ArticleCategory] ?? a.category;

  return (
    <article className="container-page py-12">
      <JsonLd
        data={articleJsonLd({
          url,
          title: a.title,
          description: a.meta_description || a.summary,
          publishedAt: a.published_at,
          updatedAt: a.content_updated_at,
          authorName: a.author_name,
          reviewerName: a.reviewer_name,
          imageUrl: a.cover_image_url,
          publisherName: siteConfig.name,
          publisherUrl: siteConfig.url,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Início', url: siteConfig.url },
          { name: 'Blog', url: absoluteUrl(siteConfig.url, '/blog') },
          { name: a.title, url },
        ])}
      />
      <nav aria-label="Trilha" className="text-sm text-muted">
        <Link href="/" className="hover:underline">Início</Link> / <Link href="/blog" className="hover:underline">Blog</Link> /{' '}
        <Link href={`/blog?categoria=${a.category}`} className="hover:underline">{category}</Link>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <header>
            <Badge tone="green">{category}</Badge>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-[2.6rem]">{a.title}</h1>
            {a.summary && <p className="mt-4 text-lg text-muted">{a.summary}</p>}
            <p className="mt-4 text-sm text-muted">
              Publicado em <time dateTime={a.published_at}>{formatDate(a.published_at)}</time>
              {a.content_updated_at && a.content_updated_at.slice(0, 10) !== a.published_at.slice(0, 10) && (
                <> · Atualizado em <time dateTime={a.content_updated_at}>{formatDate(a.content_updated_at)}</time></>
              )}
              {a.author_name && <> · {a.author_name}</>}
              {a.reviewer_name && <> · Revisado por {a.reviewer_name}</>}
            </p>
          </header>

          {a.cover_image_url && (
            <figure className="mt-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.cover_image_url}
                alt={a.cover_image_alt ?? ''}
                width={1200}
                height={675}
                fetchPriority="high"
                decoding="async"
                className="aspect-[16/9] w-full rounded-2xl object-cover"
              />
              {a.cover_image_credit && (
                <figcaption className="mt-2 text-xs text-muted">
                  Foto:{' '}
                  {a.cover_image_credit_url ? (
                    <a href={a.cover_image_credit_url} target="_blank" rel="noopener noreferrer nofollow" className="underline">{a.cover_image_credit}</a>
                  ) : (
                    a.cover_image_credit
                  )}
                </figcaption>
              )}
            </figure>
          )}

          <div className="prose-article mt-8" dangerouslySetInnerHTML={{ __html: html }} />

          {a.tags.length > 0 && (
            <p className="mt-8 flex flex-wrap gap-2">
              {a.tags.map((t) => (
                <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="rounded-full bg-navy-50 px-3 py-1 text-sm text-navy-800 hover:bg-navy-100">#{t}</Link>
              ))}
            </p>
          )}

          <section aria-labelledby="fontes" className="mt-10 rounded-2xl border border-line p-6">
            <h2 id="fontes" className="text-lg font-bold">Fontes e referências</h2>
            {a.sources.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Conteúdo conceitual, sem dados de terceiros.</p>
            ) : (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                {a.sources.map((s, i) => (
                  <li key={s.id} id={`fonte-${i + 1}`}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-navy-700 underline">{s.title ?? s.url}</a>
                    {s.publisher && <span className="text-muted"> — {s.publisher}</span>}
                    <span className="text-muted"> (acesso em {new Date(s.accessed_at).toLocaleDateString('pt-BR')})</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div className="mt-8"><Disclaimers /></div>

          <section className="mt-10" aria-labelledby="propostas">
            <Card className="p-6">
              <h2 id="propostas" className="text-xl font-bold">Quer receber propostas reais?</h2>
              <p className="mt-1 text-sm text-muted">Opcional e gratuito. Você decide se autoriza o compartilhamento.</p>
              <div className="mt-5">
                <LeadForm modalities={modalities} administrators={administrators} source="blog" turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
              </div>
            </Card>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {headings.length > 2 && (
            <Card className="p-5">
              <p className="text-sm font-bold text-navy-900">Neste artigo</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {headings.map((h) => (
                  <li key={h.id} className={h.level === 3 ? 'pl-3' : ''}>
                    <a href={`#${h.id}`} className="text-muted hover:text-navy-900">{h.text}</a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-5">
            <p className="font-display font-bold text-navy-900">Faça uma simulação</p>
            <p className="mt-1 text-sm text-muted">Veja cenários ilustrativos de parcela para o seu objetivo.</p>
            <ButtonLink href="/simulador" className="mt-4 w-full">Abrir simulador</ButtonLink>
          </Card>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold">Artigos relacionados</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((r) => <ArticleCardView key={r.id} a={r} />)}
          </div>
        </section>
      )}
    </article>
  );
}
