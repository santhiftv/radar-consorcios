import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCardView } from '@/components/content-blocks';
import { EmptyState } from '@/components/ui';
import { ARTICLE_CATEGORIES, CATEGORY_LABELS, type ArticleCategory } from '@/lib/domain/editorial';
import { searchArticles } from '@/lib/server/queries';

type SP = Promise<{ q?: string; categoria?: string; tag?: string; pagina?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = sp.categoria && (ARTICLE_CATEGORIES as readonly string[]).includes(sp.categoria) ? CATEGORY_LABELS[sp.categoria as ArticleCategory] : null;
  return {
    title: cat ? `Blog — ${cat}` : 'Blog sobre consórcio',
    description: 'Guias, comparativos e análises sobre consórcio com fontes indicadas e revisão humana.',
    alternates: { canonical: cat ? `/blog?categoria=${sp.categoria}` : '/blog' },
    robots: sp.q || sp.pagina ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = sp.categoria && (ARTICLE_CATEGORIES as readonly string[]).includes(sp.categoria) ? sp.categoria : undefined;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const { items, total } = await searchArticles({ q: sp.q, category, tag: sp.tag?.slice(0, 40), page });
  const pages = Math.max(1, Math.ceil(total / 12));
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    Object.entries({ q: sp.q, categoria: category, tag: sp.tag, ...p }).forEach(([k, v]) => v && u.set(k, v));
    const s = u.toString();
    return s ? `/blog?${s}` : '/blog';
  };

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Blog</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">Conteúdo educativo sobre consórcio, com fontes indicadas e revisão humana antes da publicação.</p>

      <form action="/blog" className="mt-8 flex flex-col gap-3 sm:flex-row" role="search">
        {category && <input type="hidden" name="categoria" value={category} />}
        <label htmlFor="q" className="sr-only">Buscar artigos</label>
        <input id="q" name="q" defaultValue={sp.q} placeholder="Buscar: lance, contemplação, taxa de administração…" className="field-input sm:max-w-md" />
        <button className="rounded-lg bg-navy-900 px-5 py-2.5 font-semibold text-white hover:bg-navy-800">Buscar</button>
      </form>

      <nav aria-label="Categorias" className="mt-5 flex flex-wrap gap-2">
        <Link href={qs({ categoria: undefined, pagina: undefined })} className={`rounded-full border px-3 py-1 text-sm ${!category ? 'border-navy-900 bg-navy-900 text-white' : 'border-line hover:border-navy-700'}`}>
          Todas
        </Link>
        {ARTICLE_CATEGORIES.map((c) => (
          <Link key={c} href={qs({ categoria: c, pagina: undefined })} className={`rounded-full border px-3 py-1 text-sm ${category === c ? 'border-navy-900 bg-navy-900 text-white' : 'border-line hover:border-navy-700'}`}>
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </nav>
      {sp.tag && <p className="mt-3 text-sm text-muted">Tag: <strong>#{sp.tag}</strong> · <Link className="underline" href={qs({ tag: undefined })}>limpar</Link></p>}

      {items.length === 0 ? (
        <div className="mt-10"><EmptyState title="Nenhum artigo encontrado">Tente outra busca ou categoria.</EmptyState></div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => <ArticleCardView key={a.id} a={a} />)}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="mt-10 flex justify-center gap-2">
          {page > 1 && <Link className="rounded-lg border border-line px-4 py-2 text-sm" href={qs({ pagina: String(page - 1) })}>Anterior</Link>}
          <span className="px-3 py-2 text-sm text-muted">Página {page} de {pages}</span>
          {page < pages && <Link className="rounded-lg border border-line px-4 py-2 text-sm" href={qs({ pagina: String(page + 1) })}>Próxima</Link>}
        </nav>
      )}
    </div>
  );
}
