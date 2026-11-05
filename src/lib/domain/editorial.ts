/**
 * Validações editoriais automáticas. Elas NÃO substituem a revisão humana:
 * geram alertas ("flags") que o revisor precisa reconhecer antes de publicar.
 */

export const ARTICLE_CATEGORIES = ['educacao', 'comparativos', 'mercado', 'planejamento', 'guias', 'faq'] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  educacao: 'Educação',
  comparativos: 'Comparativos',
  mercado: 'Mercado e notícias',
  planejamento: 'Planejamento',
  guias: 'Guias práticos',
  faq: 'Perguntas frequentes',
};

export interface DraftSource {
  url: string;
  title?: string;
  publisher?: string;
  accessed_at?: string;
}

export interface Draft {
  title: string;
  summary: string;
  content_md: string;
  meta_description: string;
  category: ArticleCategory;
  tags: string[];
  sources: DraftSource[];
}

export interface EditorialFlag {
  type: 'unsourced_number' | 'prohibited_claim' | 'similar_article' | 'few_sources' | 'short_content' | 'date_check';
  message: string;
  excerpt?: string;
}

// ----------------------------------------------------------------------------- similaridade
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function shingles(text: string, k = 4): Set<string> {
  const t = tokens(text);
  const out = new Set<string>();
  if (t.length < k) {
    if (t.length) out.add(t.join(' '));
    return out;
  }
  for (let i = 0; i <= t.length - k; i++) out.add(t.slice(i, i + k).join(' '));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function mostSimilar(
  draft: Pick<Draft, 'title' | 'content_md'>,
  existing: Array<{ id: string; title: string; content_md: string }>,
): { id: string | null; score: number } {
  const d = shingles(`${draft.title} ${draft.content_md}`);
  const dTitle = new Set(tokens(draft.title));
  let best = { id: null as string | null, score: 0 };
  for (const e of existing) {
    const body = jaccard(d, shingles(`${e.title} ${e.content_md}`));
    const title = jaccard(dTitle, new Set(tokens(e.title)));
    const score = Math.max(body, title * 0.8);
    if (score > best.score) best = { id: e.id, score: Math.round(score * 1000) / 1000 };
  }
  return best;
}

// ----------------------------------------------------------------------------- afirmações
const NUMBER_CLAIM = /(\d+(?:[.,]\d+)?\s?%|R\$\s?\d|\d+(?:[.,]\d+)?\s?(?:mil|milh(?:ão|ões)|bilh(?:ão|ões))\b|\b(?:19|20)\d{2}\b)/i;
const CITATION = /\[(\d+|fonte)\]/i;

const PROHIBITED: Array<{ re: RegExp; message: string }> = [
  { re: /contempla[cç][aã]o\s+garantida|garantia\s+de\s+contempla[cç][aã]o/i, message: 'Promessa de contemplação garantida' },
  { re: /\b(?:aprova[cç][aã]o\s+imediata|cr[eé]dito\s+garantido)\b/i, message: 'Promessa de aprovação/crédito garantido' },
  { re: /\bmelhor(?:es)?\s+taxas?\s+do\s+mercado\b/i, message: 'Alegação comparativa sem comprovação' },
  { re: /\bparceir[oa]\s+oficial\b/i, message: 'Alegação de parceria oficial' },
  { re: /\bsem\s+(?:nenhum\s+)?custo\b/i, message: 'Alegação de ausência de custos' },
];

function sentences(markdown: string): string[] {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\n+/)
    .filter((l) => !/^\s*#/.test(l)) // ignora títulos
    .flatMap((l) => l.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function findUnsourcedClaims(markdown: string): EditorialFlag[] {
  const flags: EditorialFlag[] = [];
  for (const s of sentences(markdown)) {
    if (NUMBER_CLAIM.test(s) && !CITATION.test(s)) {
      flags.push({ type: 'unsourced_number', message: 'Número, valor ou data sem fonte indicada', excerpt: s.slice(0, 200) });
    }
  }
  return flags;
}

export function findProhibitedClaims(markdown: string): EditorialFlag[] {
  const flags: EditorialFlag[] = [];
  for (const s of sentences(markdown)) {
    for (const p of PROHIBITED) {
      if (p.re.test(s)) flags.push({ type: 'prohibited_claim', message: p.message, excerpt: s.slice(0, 200) });
    }
  }
  return flags;
}

export function wordCount(markdown: string): number {
  return tokens(markdown).length;
}

export interface DraftValidation {
  errors: string[]; // impedem salvar
  flags: EditorialFlag[]; // exigem reconhecimento humano
}

export function validateDraft(draft: Draft, opts: { minWords?: number; minSourcesNews?: number } = {}): DraftValidation {
  const errors: string[] = [];
  const flags: EditorialFlag[] = [];
  const minWords = opts.minWords ?? 600;

  if (!draft.title || draft.title.length < 10 || draft.title.length > 160) errors.push('Título ausente ou fora do tamanho (10–160).');
  if (!draft.content_md || draft.content_md.length < 400) errors.push('Conteúdo ausente ou muito curto.');
  if (!(ARTICLE_CATEGORIES as readonly string[]).includes(draft.category)) errors.push('Categoria inválida.');
  const validSources = draft.sources.filter((s) => /^https?:\/\/[^\s]+\.[^\s]+/.test(s.url));
  if (draft.category === 'mercado' && validSources.length < (opts.minSourcesNews ?? 2)) {
    errors.push('Notícia/análise de mercado sem fontes suficientes.');
  }

  if (wordCount(draft.content_md) < minWords) {
    flags.push({ type: 'short_content', message: `Conteúdo com menos de ${minWords} palavras; avalie se está superficial.` });
  }
  if (validSources.length < 2) flags.push({ type: 'few_sources', message: 'Menos de duas fontes registradas.' });
  flags.push(...findUnsourcedClaims(draft.content_md));
  flags.push(...findProhibitedClaims(`${draft.title}\n${draft.summary}\n${draft.content_md}`));
  if (/\b(?:hoje|nesta semana|este m[eê]s|recentemente)\b/i.test(draft.content_md)) {
    flags.push({ type: 'date_check', message: 'Texto usa referência temporal relativa; confirme datas antes de publicar.' });
  }
  return { errors, flags };
}

/** Sem fontes suficientes para notícia → substitui por guia educativo. */
export function fallbackCategory(category: ArticleCategory, insufficientSources: boolean): { category: ArticleCategory; fallback: boolean } {
  if (category === 'mercado' && insufficientSources) return { category: 'educacao', fallback: true };
  return { category, fallback: false };
}
