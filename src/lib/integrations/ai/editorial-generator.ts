/**
 * Geração de RASCUNHOS editoriais com IA + pesquisa na web (API da Anthropic,
 * via REST). A saída sempre vai para a fila de revisão humana.
 *
 * Variáveis: AI_PROVIDER=anthropic, AI_API_KEY, AI_MODEL, AI_WEB_SEARCH_TOOL.
 * Confirme na documentação vigente o ID do modelo e o tipo da ferramenta de
 * busca (ex.: "web_search_20250305").
 */
import { CATEGORY_LABELS, type ArticleCategory, type Draft, type DraftSource } from '../../domain/editorial.ts';

export interface GeneratorConfig {
  apiKey?: string;
  model?: string;
  webSearchTool?: string;
  fetchImpl?: typeof fetch;
  maxSearches?: number;
}

export interface GenerateArgs {
  category: ArticleCategory;
  topic?: string | null;
  avoidTitles: string[];
  today: string; // AAAA-MM-DD
}

export type GenerateResult =
  | { ok: true; draft: Draft; searchedUrls: string[] }
  | { ok: false; reason: 'not_configured' | 'insufficient_sources' | 'provider_error' | 'invalid_output'; detail?: string };

export const PREFERRED_DOMAINS = [
  'bcb.gov.br', 'gov.br', 'planalto.gov.br', 'camara.leg.br', 'senado.leg.br', 'ibge.gov.br', 'procon.sp.gov.br',
];

export function buildEditorialPrompt(args: GenerateArgs): { system: string; user: string } {
  const system = [
    'Você é redator(a) de conteúdo educativo sobre consórcios no Brasil para um blog independente.',
    'Regras obrigatórias:',
    '- Pesquise antes de escrever. Priorize fontes oficiais e originais: Banco Central do Brasil, legislação (Lei 11.795/2008 e normas do BCB), órgãos públicos e páginas oficiais de administradoras.',
    '- Nunca invente números, taxas, datas, notícias, estatísticas, depoimentos ou citações.',
    '- Todo número, valor, percentual ou data deve ter marcador de fonte no formato [n], onde n é a posição na lista "sources".',
    '- Não prometa contemplação, aprovação de crédito, rentabilidade ou "melhores taxas". Não afirme parceria com administradoras.',
    '- Explique que condições reais dependem da administradora, do grupo e do contrato.',
    '- Linguagem clara, em português do Brasil, sem sensacionalismo. Use títulos ## e ###, listas quando ajudarem.',
    '- Se for notícia/mercado e não houver fontes confiáveis e recentes suficientes (mínimo 2), responda apenas {"insufficient_sources": true}.',
    'Responda SOMENTE com um objeto JSON dentro de um bloco ```json, no formato:',
    '{"title": "...", "summary": "1–2 frases", "meta_description": "até 160 caracteres", "tags": ["..."],',
    ' "content_md": "markdown com 800–1400 palavras e marcadores [n]",',
    ' "sources": [{"url": "https://...", "title": "...", "publisher": "...", "accessed_at": "AAAA-MM-DD"}]}',
  ].join('\n');

  const user = [
    `Data de hoje: ${args.today}.`,
    `Categoria: ${CATEGORY_LABELS[args.category]} (${args.category}).`,
    args.topic ? `Pauta definida pelo editor: ${args.topic}` : 'Escolha uma pauta concreta e útil dentro da categoria.',
    args.avoidTitles.length
      ? `Evite repetir estes temas já publicados ou em revisão:\n- ${args.avoidTitles.slice(0, 40).join('\n- ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  return { system, user };
}

interface ContentBlock {
  type: string;
  text?: string;
  content?: unknown;
}

export function extractJson(text: string): unknown {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1]! : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(candidate);
}

export function collectSearchedUrls(blocks: ContentBlock[]): string[] {
  const urls = new Set<string>();
  for (const b of blocks) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content as Array<{ url?: string }>) if (r.url) urls.add(r.url);
    }
  }
  return [...urls];
}

export function createEditorialGenerator(cfg: GeneratorConfig) {
  const f = cfg.fetchImpl ?? fetch;
  const configured = Boolean(cfg.apiKey);

  return {
    configured,
    async generate(args: GenerateArgs): Promise<GenerateResult> {
      if (!configured) return { ok: false, reason: 'not_configured' };
      const { system, user } = buildEditorialPrompt(args);
      let res: Response;
      try {
        res = await f('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': cfg.apiKey!,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: cfg.model || 'claude-sonnet-5-5',
            max_tokens: 8000,
            system,
            messages: [{ role: 'user', content: user }],
            tools: [{ type: cfg.webSearchTool || 'web_search_20250305', name: 'web_search', max_uses: cfg.maxSearches ?? 8 }],
          }),
        });
      } catch (e) {
        return { ok: false, reason: 'provider_error', detail: (e as Error).message };
      }
      if (!res.ok) return { ok: false, reason: 'provider_error', detail: `HTTP ${res.status}` };

      const data = (await res.json()) as { content?: ContentBlock[] };
      const blocks = data.content ?? [];
      const text = blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
      const searchedUrls = collectSearchedUrls(blocks);

      let parsed: Record<string, unknown>;
      try {
        parsed = extractJson(text) as Record<string, unknown>;
      } catch {
        return { ok: false, reason: 'invalid_output', detail: 'JSON não encontrado na resposta' };
      }
      if (parsed.insufficient_sources === true) return { ok: false, reason: 'insufficient_sources' };

      const sources = Array.isArray(parsed.sources) ? (parsed.sources as DraftSource[]).filter((s) => typeof s?.url === 'string') : [];
      const draft: Draft = {
        title: String(parsed.title ?? '').trim(),
        summary: String(parsed.summary ?? '').trim(),
        meta_description: String(parsed.meta_description ?? '').trim().slice(0, 170),
        content_md: String(parsed.content_md ?? ''),
        category: args.category,
        tags: Array.isArray(parsed.tags) ? (parsed.tags as unknown[]).map(String).slice(0, 8) : [],
        sources,
      };
      return { ok: true, draft, searchedUrls };
    },
  };
}

export type EditorialGenerator = ReturnType<typeof createEditorialGenerator>;
