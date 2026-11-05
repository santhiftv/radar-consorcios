import { timingSafeEqual } from 'node:crypto';

/**
 * Autoriza chamadas de cron. A Vercel envia "Authorization: Bearer <CRON_SECRET>".
 * Agendadores externos devem enviar o mesmo cabeçalho.
 */
export function isAuthorizedCron(authorizationHeader: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !authorizationHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(authorizationHeader);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
