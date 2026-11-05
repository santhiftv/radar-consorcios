/**
 * Conversor Markdown → HTML mínimo e SEGURO para os artigos do blog.
 * Escapa todo HTML de entrada; só gera um conjunto fechado de tags.
 * Suporta: ## / ### títulos, parágrafos, **negrito**, *itálico*, `código`,
 * listas (- e 1.), citações (>), links [texto](https://...) e internos [texto](/rota),
 * tabelas simples (| a | b |) e marcadores de fonte [1] que apontam para a
 * lista de referências (#fonte-1).
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function inline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label: string, url: string) => {
    const safe = url.replace(/"/g, '%22');
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
  });
  // Links internos (mesma aba, sem nofollow): apenas caminhos que começam com "/" (nunca "//")
  out = out.replace(/\[([^\]]+)\]\((\/(?!\/)[A-Za-z0-9\-._~\/?#=&%+]*)\)/g, (_m, label: string, path: string) => `<a href="${path}">${label}</a>`);
  out = out.replace(/\[(\d{1,2})\]/g, '<sup><a href="#fonte-$1" aria-label="Fonte $1">[$1]</a></sup>');
  return out;
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function headingId(text: string, used: Set<string>): string {
  const base =
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'secao';
  let id = base;
  let i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  used.add(id);
  return id;
}

export function renderMarkdown(md: string): { html: string; headings: Heading[] } {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  const headings: Heading[] = [];
  const used = new Set<string>();
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];
  let table: string[][] | null = null;

  const flushPara = () => {
    if (para.length) html.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
    quote = [];
  };
  const flushTable = () => {
    if (table && table.length) {
      const [head, ...body] = table;
      html.push(
        `<div class="table-wrap"><table><thead><tr>${head!.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
      );
    }
    table = null;
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
    flushTable();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushAll();
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushPara();
      flushList();
      flushQuote();
      const cells = line.trim().slice(1, -1).split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // linha separadora
      (table ??= []).push(cells);
      continue;
    }
    flushTable();
    const h = /^(#{2,3})\s+(.+)$/.exec(line);
    if (h) {
      flushAll();
      const level = h[1]!.length as 2 | 3;
      const text = h[2]!.trim();
      const id = headingId(text, used);
      headings.push({ id, text, level });
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      // H1 é reservado para o título da página: rebaixa para H2
      flushAll();
      const text = line.replace(/^#\s+/, '');
      const id = headingId(text, used);
      headings.push({ id, text, level: 2 });
      html.push(`<h2 id="${id}">${inline(text)}</h2>`);
      continue;
    }
    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (ul || ol) {
      flushPara();
      flushQuote();
      const type = ul ? 'ul' : 'ol';
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((ul ?? ol)![1]!);
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1]!);
      continue;
    }
    flushList();
    flushQuote();
    para.push(line.trim());
  }
  flushAll();
  return { html: html.join('\n'), headings };
}

export function excerpt(md: string, max = 160): string {
  const text = md
    .replace(/^#+\s.*$/gm, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\[(\d+)\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}
