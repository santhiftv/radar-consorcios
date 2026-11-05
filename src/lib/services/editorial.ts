/**
 * Execução de um job editorial: pesquisa + rascunho + validações → fila de
 * revisão. NUNCA publica. Sem provedor de IA configurado, a fila NÃO é
 * consumida: as pautas continuam "queued" para a rotina editorial assistida
 * (ou o editor) escrever e vincular o artigo ao job.
 */
import { fallbackCategory, mostSimilar, validateDraft, type ArticleCategory, type EditorialFlag } from '../domain/editorial.ts';
import { slugify } from '../domain/slug.ts';
import type { EditorialGenerator } from '../integrations/ai/editorial-generator.ts';
import { silentLogger, type Logger, type Rpc } from './types.ts';

export interface EditorialDeps {
  rpc: Rpc;
  generator: EditorialGenerator;
  listExistingArticles: () => Promise<Array<{ id: string; title: string; content_md: string }>>;
  today: () => string;
  logger?: Logger;
  similarityReject?: number; // acima disso, descarta o rascunho
  similarityFlag?: number; // acima disso, sinaliza ao revisor
}

export type EditorialRunResult =
  | { status: 'idle' }
  | { status: 'drafted'; articleId: string; flags: number; fallback: boolean }
  | { status: 'skipped' | 'failed' | 'retry'; reason: string };

interface Job {
  id: string;
  category: ArticleCategory;
  topic: string | null;
}

export async function runNextEditorialJob(deps: EditorialDeps): Promise<EditorialRunResult> {
  const log = deps.logger ?? silentLogger;
  if (!deps.generator.configured) {
    return { status: 'skipped', reason: 'ai_not_configured' };
  }
  const claimed = await deps.rpc<Job | null>('claim_editorial_job');
  if (claimed.error) {
    log.error('claim_editorial_job_failed', { code: claimed.error.code });
    return { status: 'failed', reason: 'claim_failed' };
  }
  const job = claimed.data;
  if (!job || !job.id) return { status: 'idle' };

  const fail = async (reason: string, skip = false): Promise<EditorialRunResult> => {
    await deps.rpc('fail_editorial_job', { p_job_id: job.id, p_error: reason, p_skip: skip });
    return { status: skip ? 'skipped' : 'retry', reason };
  };

  const existing = await deps.listExistingArticles();
  let category = job.category;
  let fallbackApplied = false;

  let result = await deps.generator.generate({
    category,
    topic: job.topic,
    avoidTitles: existing.map((e) => e.title),
    today: deps.today(),
  });

  if (!result.ok && result.reason === 'insufficient_sources') {
    const fb = fallbackCategory(category, true);
    if (fb.fallback) {
      category = fb.category;
      fallbackApplied = true;
      result = await deps.generator.generate({ category, topic: null, avoidTitles: existing.map((e) => e.title), today: deps.today() });
    }
  }
  if (!result.ok) return fail(`Geração falhou: ${result.reason}${'detail' in result && result.detail ? ` (${result.detail})` : ''}`);

  const draft = { ...result.draft, category };
  const validation = validateDraft(draft);
  if (validation.errors.length > 0) return fail(`Rascunho reprovado na validação: ${validation.errors.join(' ')}`);

  const flags: EditorialFlag[] = [...validation.flags];
  // Fontes citadas que não apareceram nas buscas realizadas: possível alucinação
  if (result.searchedUrls.length > 0) {
    for (const s of draft.sources) {
      if (!result.searchedUrls.some((u) => u.split('#')[0] === s.url.split('#')[0])) {
        flags.push({ type: 'few_sources', message: 'Fonte não encontrada nos resultados de busca; verifique manualmente.', excerpt: s.url });
      }
    }
  }

  const sim = mostSimilar(draft, existing);
  if (sim.score >= (deps.similarityReject ?? 0.6)) return fail(`Rascunho muito semelhante a artigo existente (${sim.score}).`);
  if (sim.score >= (deps.similarityFlag ?? 0.35)) {
    flags.push({ type: 'similar_article', message: `Semelhança ${sim.score} com artigo existente.`, excerpt: sim.id ?? undefined });
  }

  const saved = await deps.rpc<string>('save_editorial_draft', {
    p_job_id: job.id,
    p_article: {
      slug: slugify(draft.title),
      title: draft.title,
      summary: draft.summary,
      content_md: draft.content_md,
      meta_description: draft.meta_description,
      category,
      tags: draft.tags,
      flags,
      similarity_max: sim.score,
      similar_to_article_id: sim.score >= (deps.similarityFlag ?? 0.35) ? sim.id : null,
      fallback_applied: fallbackApplied,
    },
    p_sources: draft.sources,
  });
  if (saved.error || !saved.data) return fail(`Falha ao salvar rascunho: ${saved.error?.code ?? 'desconhecido'}`);
  log.info('editorial_draft_saved', { articleId: saved.data, flags: flags.length, fallbackApplied });
  return { status: 'drafted', articleId: saved.data, flags: flags.length, fallback: fallbackApplied };
}
