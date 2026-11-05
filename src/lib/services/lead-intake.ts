/**
 * Entrada de solicitações de proposta (formulário público).
 * Ordem: rate limit → antispam → captcha (opcional) → validação → classificação
 * → função transacional no banco (consentimento, duplicidade, distribuição).
 */
import { classifyLead } from '../domain/quality.ts';
import { spamSignals, validateLeadForm, type LeadFormRaw } from '../domain/validation.ts';
import { businessCode, silentLogger, type Logger, type Rpc, type ServiceResponse } from './types.ts';

export interface LeadIntakeDeps {
  rpc: Rpc; // cliente com service_role (somente no servidor)
  listActiveModalities: () => Promise<string[]>;
  verifyCaptcha: (token: string | null, ip: string | null) => Promise<{ enabled: boolean; ok: boolean }>;
  onCreated?: (info: { email: string; firstName: string }) => Promise<void>;
  now?: () => number;
  logger?: Logger;
}

export interface LeadIntakeContext {
  ip: string | null;
}

export const LEAD_RATE_LIMITS = [
  { window: 600, max: 5 }, // 5 envios a cada 10 min por IP
  { window: 86_400, max: 20 }, // 20 por dia por IP
] as const;

export async function processLeadSubmission(raw: LeadFormRaw, ctx: LeadIntakeContext, deps: LeadIntakeDeps): Promise<ServiceResponse> {
  const log = deps.logger ?? silentLogger;
  const now = deps.now?.() ?? Date.now();
  const ipKey = ctx.ip ?? 'unknown';

  for (const rl of LEAD_RATE_LIMITS) {
    const { data, error } = await deps.rpc<boolean>('hit_rate_limit', {
      p_key: `lead:${rl.window}:${ipKey}`,
      p_window_seconds: rl.window,
      p_max: rl.max,
    });
    if (error) {
      log.error('rate_limit_error', { code: error.code });
      return { status: 503, body: { error: 'Serviço temporariamente indisponível. Tente novamente em instantes.' } };
    }
    if (data === false) {
      return { status: 429, body: { error: 'Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente.' } };
    }
  }

  const signals = spamSignals(raw, now);
  if (signals.includes('honeypot')) {
    log.warn('lead_spam_honeypot');
    // Resposta neutra para robôs; nada é armazenado.
    return { status: 202, body: { status: 'received' } };
  }
  if (signals.includes('too_fast') || signals.includes('missing_timer') || signals.includes('stale_form')) {
    return { status: 400, body: { error: 'Não foi possível validar o envio. Recarregue a página, revise os dados e envie novamente.' } };
  }

  const captcha = await deps.verifyCaptcha(typeof raw.captchaToken === 'string' ? raw.captchaToken : null, ctx.ip);
  if (captcha.enabled && !captcha.ok) {
    return { status: 400, body: { error: 'Verificação antispam falhou. Tente novamente.' } };
  }

  const modalities = await deps.listActiveModalities();
  const v = validateLeadForm(raw, modalities);
  const urgency = parseUrgency(raw.urgency);
  if (!v.ok || urgency == null) {
    const fields = { ...(v.ok ? {} : v.errors), ...(urgency == null ? { urgency: 'Escolha de 0 a 10 a sua urgência para contratar.' } : {}) };
    return { status: 400, body: { error: 'Revise os campos destacados.', fields } };
  }

  const d = v.data;
  const quality = classifyLead(d);

  const { data, error } = await deps.rpc<{ status: string; lead_id?: string; lead_request_id?: string }>('submit_lead_request', {
    p: {
      source: d.source,
      source_path: d.sourcePath,
      utm: d.utm,
      full_name: d.fullName,
      email: d.email,
      phone_e164: d.phoneE164,
      city: d.city,
      state: d.state,
      neighborhood: d.neighborhood,
      modality_id: d.modalityId,
      credit_min_cents: d.creditMinCents,
      credit_max_cents: d.creditMaxCents,
      installment_min_cents: d.installmentMinCents,
      installment_max_cents: d.installmentMaxCents,
      term_months: d.termMonths,
      best_contact_time: d.bestContactTime,
      urgency,
      preferred_administrator_id: d.preferredAdministratorId,
      preferred_channel: d.preferredChannel,
      notice_version: d.noticeVersion,
      consent_share: d.consentShare,
      consent_marketing: d.consentMarketing,
      quality_score: quality.score,
      quality_tier: quality.tier,
      ip: ctx.ip,
    },
  });

  if (error) {
    const code = businessCode(error);
    switch (code) {
      case 'NOTICE_VERSION_MISMATCH':
        return { status: 409, body: { error: 'O aviso de privacidade foi atualizado. Recarregue a página para ler a versão vigente.' } };
      case 'CONSENT_REQUIRED':
        return { status: 400, body: { error: 'Autorize o compartilhamento para receber propostas.', fields: { consentShare: 'Obrigatório' } } };
      case 'INVALID_EMAIL':
      case 'INVALID_PHONE':
      case 'INVALID_LOCATION':
      case 'INVALID_MODALITY':
      case 'INVALID_URGENCY':
        return { status: 400, body: { error: 'Revise os dados informados.' } };
      default:
        log.error('lead_submit_failed', { code: error.code ?? code });
        return { status: 500, body: { error: 'Não foi possível registrar sua solicitação agora. Tente novamente.' } };
    }
  }

  if (data?.status === 'duplicate') {
    return {
      status: 200,
      body: { status: 'duplicate', message: 'Já recebemos uma solicitação recente com estes dados. Um consultor poderá entrar em contato.' },
    };
  }

  if (deps.onCreated) {
    try {
      await deps.onCreated({ email: d.email, firstName: d.fullName.split(' ')[0] ?? d.fullName });
    } catch (e) {
      log.warn('lead_confirmation_email_failed', { error: (e as Error).message });
    }
  }

  log.info('lead_created', { leadId: data?.lead_id, tier: quality.tier });
  return { status: 201, body: { status: 'created', message: 'Solicitação registrada.' } };
}

/** Urgência para contratar (0–10), escolhida pela própria pessoa no formulário. */
export function parseUrgency(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : null;
}
