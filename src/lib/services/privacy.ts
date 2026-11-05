/**
 * Solicitações de direitos do titular com confirmação por e-mail (evita que
 * terceiros façam pedidos em nome de outra pessoa). A resposta é sempre a mesma,
 * exista ou não o e-mail na base (não revela quem é cliente).
 */
import { createHash, randomBytes } from 'node:crypto';
import type { EmailSender } from '../integrations/email/resend.ts';
import { privacyConfirmationEmail } from '../integrations/email/templates.ts';
import { normalizeEmail, cleanText } from '../domain/validation.ts';
import { silentLogger, type Logger, type Rpc, type ServiceResponse } from './types.ts';

export const PRIVACY_REQUEST_TYPES = {
  access: 'Acesso aos meus dados',
  correction: 'Correção de dados',
  deletion: 'Exclusão dos meus dados',
  opt_out_marketing: 'Parar de receber comunicações promocionais',
  withdraw_sharing: 'Revogar o compartilhamento com consultores',
  other: 'Outra solicitação',
} as const;
export type PrivacyRequestType = keyof typeof PRIVACY_REQUEST_TYPES;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface PrivacyDeps {
  rpc: Rpc;
  email: EmailSender;
  siteUrl: string;
  brand: string;
  randomToken?: () => string;
  logger?: Logger;
}

const GENERIC_OK = {
  message: 'Se houver dados associados a este e-mail, enviaremos um link de confirmação. Verifique sua caixa de entrada.',
};

export async function createPrivacyRequest(
  input: { type: unknown; email: unknown; details: unknown; ip: string | null },
  deps: PrivacyDeps,
): Promise<ServiceResponse> {
  const log = deps.logger ?? silentLogger;
  const type = String(input.type) as PrivacyRequestType;
  if (!(type in PRIVACY_REQUEST_TYPES)) return { status: 400, body: { error: 'Tipo de solicitação inválido.' } };
  const email = normalizeEmail(input.email);
  if (!email) return { status: 400, body: { error: 'Informe um e-mail válido.' } };

  const rl = await deps.rpc<boolean>('hit_rate_limit', { p_key: `privacy:${input.ip ?? 'unknown'}`, p_window_seconds: 3600, p_max: 5 });
  if (rl.data === false) return { status: 429, body: { error: 'Muitas solicitações. Tente novamente mais tarde.' } };
  const rlEmail = await deps.rpc<boolean>('hit_rate_limit', { p_key: `privacy-email:${hashToken(email)}`, p_window_seconds: 3600, p_max: 3 });
  if (rlEmail.data === false) return { status: 200, body: GENERIC_OK };

  const token = deps.randomToken?.() ?? randomBytes(32).toString('base64url');
  const created = await deps.rpc<string>('create_privacy_request', {
    p_type: type,
    p_email: email,
    p_details: cleanText(input.details, 2000),
    p_token_hash: hashToken(token),
  });
  if (created.error) {
    log.error('privacy_request_failed', { code: created.error.code });
    return { status: 500, body: { error: 'Não foi possível registrar a solicitação. Tente novamente.' } };
  }

  const msg = privacyConfirmationEmail({
    brand: deps.brand,
    confirmUrl: `${deps.siteUrl}/privacidade/confirmar?token=${encodeURIComponent(token)}`,
    requestLabel: PRIVACY_REQUEST_TYPES[type],
  });
  const sent = await deps.email.send({ to: email, ...msg, idempotencyKey: `privacy-${created.data}` });
  if (!sent.ok) {
    log.error('privacy_email_failed', { error: sent.error });
    return {
      status: 503,
      body: { error: `Não conseguimos enviar o e-mail de confirmação agora. Escreva para o encarregado de dados ou tente mais tarde.` },
    };
  }
  return { status: 200, body: GENERIC_OK };
}

export async function confirmPrivacyRequest(token: string, deps: Pick<PrivacyDeps, 'rpc' | 'logger'>) {
  if (!token || token.length < 20) return { ok: false as const, reason: 'invalid_token' };
  const { data, error } = await deps.rpc<{ ok: boolean; reason?: string; type?: string }>('confirm_privacy_request', {
    p_token_hash: hashToken(token),
  });
  if (error || !data) return { ok: false as const, reason: 'error' };
  return data.ok ? { ok: true as const, type: data.type ?? 'other' } : { ok: false as const, reason: data.reason ?? 'invalid_token' };
}
