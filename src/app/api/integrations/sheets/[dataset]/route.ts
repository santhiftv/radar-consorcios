import { timingSafeEqual } from 'node:crypto';
import { isSheetsDataset, toCsv } from '@/lib/domain/csv';
import { serviceRpc } from '@/lib/server/deps';
import { serverEnv } from '@/lib/server/env';
import { logger } from '@/lib/services/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenOk(given: string | null): boolean {
  const expected = serverEnv.sheetsExportToken;
  if (!expected || expected.length < 24 || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Exportação somente leitura para Google Sheets:
 *   =IMPORTDATA("https://SEU-SITE/api/integrations/sheets/leads.csv?token=...", ",", "en_US")
 * Nenhum dado de contato de consumidores é exportado (ver função sheets_export no banco).
 */
export async function GET(req: Request, ctx: { params: Promise<{ dataset: string }> }) {
  const { dataset: raw } = await ctx.params;
  const dataset = raw.replace(/\.csv$/i, '');
  const url = new URL(req.url);
  if (!tokenOk(url.searchParams.get('token'))) {
    return new Response('unauthorized\n', { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!isSheetsDataset(dataset)) return new Response('dataset desconhecido\n', { status: 404 });

  const rpc = serviceRpc();
  const rl = await rpc<boolean>('hit_rate_limit', { p_key: `sheets:${dataset}`, p_window_seconds: 600, p_max: 60 });
  if (rl.data === false) return new Response('limite de consultas atingido\n', { status: 429 });

  const days = Number(url.searchParams.get('dias') ?? 90);
  const { data, error } = await rpc<Array<Record<string, unknown>>>('sheets_export', { p_dataset: dataset, p_days: Number.isFinite(days) ? days : 90 });
  if (error) {
    logger.error('sheets_export_failed', { dataset, code: error.code });
    return new Response('erro ao gerar exportação\n', { status: 500 });
  }
  logger.info('sheets_export', { dataset, rows: (data ?? []).length });
  return new Response(toCsv(data ?? []), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
