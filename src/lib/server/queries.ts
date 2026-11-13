/**
 * Consultas de conteúdo PÚBLICO (chave publicável, sem cookies → páginas
 * podem ser estáticas/ISR). Sujeitas às políticas RLS de leitura pública.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { PlanRules } from '../domain/plans';
import { serverEnv } from './env';

export function createPublicClient() {
  if (!serverEnv.supabaseUrl || !serverEnv.supabasePublishableKey) return null;
  return createSupabaseClient(serverEnv.supabaseUrl, serverEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface PublicPlan extends PlanRules {
  id: string;
  features: string[];
}

export interface Modality {
  id: string;
  name: string;
  description: string | null;
}

export interface Administrator {
  id: string;
  name: string;
  slug: string;
}

export interface ArticleCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  published_at: string;
  content_updated_at: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
}

export interface ArticleFull extends ArticleCard {
  content_md: string;
  cover_image_credit: string | null;
  cover_image_credit_url: string | null;
  meta_description: string | null;
  author_name: string | null;
  reviewer_name: string | null;
  sources: Array<{ id: string; url: string; title: string | null; publisher: string | null; accessed_at: string }>;
}

const ARTICLE_CARD = 'id, slug, title, summary, category, tags, published_at, content_updated_at, cover_image_url, cover_image_alt';

export async function getPlans(): Promise<PublicPlan[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from('plans').select('*').eq('active', true).order('sort_order');
  return (data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    priceCents: p.price_cents,
    claimLimit: p.claim_limit,
    claimsUnlimited: !!p.claims_unlimited,
    maxLeadUrgency: p.max_lead_urgency ?? 10,
    maxRegions: p.max_regions,
    maxModalities: p.max_modalities,
    allowedModalities: p.allowed_modalities,
    allowedFilters: p.allowed_filters,
    priorityDelaySeconds: p.priority_delay_seconds,
    reportLevel: p.report_level,
    supportLevel: p.support_level,
    weeklyTokens: p.weekly_tokens ?? 0,
    features: Array.isArray(p.features) ? p.features : [],
  }));
}

export async function getModalities(): Promise<Modality[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from('modalities').select('id, name, description').eq('active', true).order('sort_order');
  return data ?? [];
}

export async function getAdministrators(): Promise<Administrator[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from('administrators').select('id, name, slug').eq('active', true).order('name');
  return data ?? [];
}

export async function getRegions(): Promise<Array<{ id: string; state: string; city: string | null; label: string }>> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from('regions').select('id, state, city, label').eq('active', true).order('state').order('label');
  return data ?? [];
}

export async function getPublicSetting<T = unknown>(key: string, fallback: T): Promise<T> {
  const db = createPublicClient();
  if (!db) return fallback;
  const { data } = await db.from('app_settings').select('value').eq('key', key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

export async function getRecentArticles(limit = 6): Promise<ArticleCard[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from('articles').select(ARTICLE_CARD).order('published_at', { ascending: false }).limit(limit);
  return (data ?? []) as ArticleCard[];
}

export async function searchArticles(opts: { q?: string; category?: string; tag?: string; page?: number; pageSize?: number }) {
  const db = createPublicClient();
  if (!db) return { items: [] as ArticleCard[], total: 0 };
  const pageSize = opts.pageSize ?? 12;
  const page = Math.max(1, opts.page ?? 1);
  let query = db.from('articles').select(ARTICLE_CARD, { count: 'exact' });
  if (opts.category) query = query.eq('category', opts.category);
  if (opts.tag) query = query.contains('tags', [opts.tag]);
  if (opts.q && opts.q.trim().length >= 2) {
    query = query.textSearch('search', opts.q.trim().slice(0, 80), { type: 'websearch', config: 'portuguese' });
  }
  const { data, count } = await query
    .order('published_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  return { items: (data ?? []) as ArticleCard[], total: count ?? 0 };
}

export async function getArticleBySlug(slug: string): Promise<ArticleFull | null> {
  const db = createPublicClient();
  if (!db) return null;
  const { data } = await db
    .from('articles')
    .select(`${ARTICLE_CARD}, content_md, cover_image_credit, cover_image_credit_url, meta_description, author_name, reviewer_name, article_sources(id, url, title, publisher, accessed_at, position)`)
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  const { article_sources, ...rest } = data as unknown as ArticleFull & { article_sources: Array<ArticleFull['sources'][number] & { position: number }> };
  // A numeração [n] do texto segue a ordem de cadastro das fontes
  const sources = [...(article_sources ?? [])].sort((x, y) => Number(x.position) - Number(y.position));
  return { ...rest, sources };
}

export async function getRelatedArticles(a: Pick<ArticleCard, 'id' | 'category' | 'tags'>, limit = 3): Promise<ArticleCard[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from('articles')
    .select(ARTICLE_CARD)
    .neq('id', a.id)
    .or(`category.eq.${a.category}${a.tags.length ? `,tags.ov.{${a.tags.map((t) => t.replace(/[{},"]/g, '')).join(',')}}` : ''}`)
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ArticleCard[];
}

export async function getAllPublishedSlugs(): Promise<Array<{ slug: string; updated: string }>> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from('articles').select('slug, published_at, content_updated_at').order('published_at', { ascending: false }).limit(5000);
  return (data ?? []).map((r) => ({ slug: r.slug, updated: r.content_updated_at ?? r.published_at }));
}

/**
 * Sem os tipos gerados do banco, o supabase-js infere relações embutidas (to-one) como arrays,
 * embora o PostgREST devolva um objeto. Este helper declara o formato real da linha.
 */
export function rows<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : []) as T[];
}
