/** Conversão de linhas (objetos com as mesmas chaves) para CSV RFC 4180, pronto para IMPORTDATA do Google Sheets. */

export const SHEETS_DATASETS = ['leads', 'consultores', 'assinaturas', 'metricas', 'artigos', 'calendario'] as const;
export type SheetsDataset = (typeof SHEETS_DATASETS)[number];

export function isSheetsDataset(v: string): v is SheetsDataset {
  return (SHEETS_DATASETS as readonly string[]).includes(v);
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s: string;
  if (typeof v === 'number') s = Number.isFinite(v) ? String(v) : '';
  else if (typeof v === 'boolean') s = v ? 'sim' : 'não';
  else if (typeof v === 'object') s = JSON.stringify(v);
  else s = String(v);
  // Evita injeção de fórmulas ao abrir no Sheets/Excel (=, +, -, @ no início de texto)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: ReadonlyArray<Record<string, unknown>>, emptyHeader: readonly string[] = ['Sem dados']): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]!) : [...emptyHeader];
  const lines = [headers.map(cell).join(',')];
  for (const r of rows) lines.push(headers.map((h) => cell(r[h])).join(','));
  return lines.join('\r\n') + '\r\n';
}
