/** SEO técnico: sitemap XML e dados estruturados compatíveis com o conteúdo real. */

export interface SitemapEntry {
  url: string;
  lastModified?: Date | string | null;
  changeFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  const items = entries
    .filter((e) => {
      if (seen.has(e.url)) return false;
      seen.add(e.url);
      return true;
    })
    .map((e) => {
      const parts = [`<loc>${escapeXml(e.url)}</loc>`];
      if (e.lastModified) parts.push(`<lastmod>${new Date(e.lastModified).toISOString()}</lastmod>`);
      if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
      if (e.priority != null) parts.push(`<priority>${e.priority.toFixed(1)}</priority>`);
      return `  <url>${parts.join('')}</url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>\n`;
}

export function absoluteUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function articleJsonLd(a: {
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string | null;
  authorName?: string | null;
  reviewerName?: string | null;
  imageUrl?: string | null;
  publisherName: string;
  publisherUrl: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title.slice(0, 110),
    description: a.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': a.url },
    datePublished: a.publishedAt,
    dateModified: a.updatedAt ?? a.publishedAt,
    ...(a.authorName ? { author: { '@type': 'Organization', name: a.authorName } } : {}),
    ...(a.reviewerName ? { reviewedBy: { '@type': 'Person', name: a.reviewerName } } : {}),
    ...(a.imageUrl ? { image: [a.imageUrl] } : {}),
    publisher: { '@type': 'Organization', name: a.publisherName, url: a.publisherUrl },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

/** Use somente quando a página exibe exatamente estas perguntas e respostas. */
export function faqJsonLd(faqs: Array<{ q: string; a: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

/** Serializa JSON-LD com segurança para <script> (evita quebra de tag). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
