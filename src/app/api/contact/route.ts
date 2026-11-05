import { cleanText, normalizeEmail, spamSignals } from '@/lib/domain/validation';
import { clientIp, createAdminClient, serviceRpc } from '@/lib/server/deps';
import { isSameOrigin, json, readJson } from '@/lib/server/http';
import { logger } from '@/lib/services/log';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: 'Origem não permitida.' });
  const body = await readJson(req, 12_000);
  if (!body) return json(400, { error: 'Requisição inválida.' });

  const ip = clientIp(req.headers);
  const rl = await serviceRpc()<boolean>('hit_rate_limit', { p_key: `contact:${ip ?? 'unknown'}`, p_window_seconds: 3600, p_max: 5 });
  if (rl.data === false) return json(429, { error: 'Muitas mensagens. Tente mais tarde.' });

  if (spamSignals(body, Date.now(), 2000).some((s) => s === 'honeypot' || s === 'too_fast')) {
    return json(400, { error: 'Não foi possível validar o envio. Tente novamente.' });
  }

  const name = cleanText(body.name, 120);
  const email = normalizeEmail(body.email);
  const subject = cleanText(body.subject, 160);
  const message = typeof body.message === 'string' ? body.message.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 5000) : '';
  if (!name || !email || !subject || subject.length < 3 || message.length < 5) {
    return json(400, { error: 'Preencha nome, e-mail, assunto e mensagem.' });
  }

  const { error } = await createAdminClient().from('support_tickets').insert({
    kind: 'contact',
    requester_name: name,
    requester_email: email,
    subject,
    message,
  });
  if (error) {
    logger.error('contact_insert_failed', { code: error.code });
    return json(500, { error: 'Não foi possível registrar sua mensagem. Tente novamente.' });
  }
  return json(200, { message: 'Responderemos pelo e-mail informado.' });
}
