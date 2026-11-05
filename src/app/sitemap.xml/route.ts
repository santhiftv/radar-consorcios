import { siteConfig } from '@/config/site';
import { ARTICLE_CATEGORIES } from '@/lib/domain/editorial';
import { absoluteUrl, buildSitemapXml, type SitemapEntry } from '@/lib/domain/seo';
import { getAllPublishedSlugs } from '@/lib/server/queries';

// Regenerado no máximo a cada 10 min e imediatamente após publicação (revalidatePath).
export const revalidate = 600;

const STATIC_PAGES: Array<[string, SitemapEntry['changeFrequency'], number]> = [
  ['/', 'weekly', 1.0],
  ['/simulador', 'monthly', 0.9],
  ['/solicitar-proposta', 'monthly', 0.9],
  ['/blog', 'daily', 0.8],
  ['/como-funciona', 'monthly', 0.6],
  ['/planos', 'monthly', 0.6],
  ['/perguntas-frequentes', 'monthly', 0.6],
  ['/sobre', 'yearly', 0.4],
  ['/contato', 'yearly', 0.3],
  ['/privacidade', 'yearly', 0.2],
  ['/termos', 'yearly', 0.2],
  ['/cookies', 'yearly', 0.2],
  ['/privacidade/solicitacoes', 'yearly', 0.2],
];

export async function GET() {
  const base = siteConfig.url;
  const articles = await getAllPublishedSlugs();
  const entries: SitemapEntry[] = [
    ...STATIC_PAGES.map(([p, changeFrequency, priority]) => ({ url: absoluteUrl(base, p), changeFrequency, priority })),
    ...ARTICLE_CATEGORIES.map((c) => ({ url: absoluteUrl(base, `/blog?categoria=${c}`), changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...articles.map((a) => ({ url: absoluteUrl(base, `/blog/${a.slug}`), lastModified: a.updated, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
  return new Response(buildSitemapXml(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600' },
  });
}
