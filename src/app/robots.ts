import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  // NEXT_PUBLIC_SITE_INDEXING=off bloqueia a indexação mesmo no alvo "production" (ex.: homologação em *.vercel.app)
  const indexingOff = process.env.NEXT_PUBLIC_SITE_INDEXING === 'off';
  const isProduction =
    !indexingOff &&
    (process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production');
  return {
    // Ambientes de homologação/preview não são indexados
    rules: isProduction
      ? [{ userAgent: '*', allow: '/', disallow: ['/painel', '/admin', '/api/', '/entrar', '/cadastro', '/privacidade/confirmar'] }]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
