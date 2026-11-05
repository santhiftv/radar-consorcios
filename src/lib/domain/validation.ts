/**
 * Validação e normalização server-side (sem dependências externas).
 * A interface usa as mesmas funções para feedback imediato, mas a validação
 * que vale é a do servidor (Route Handler) e a do banco (constraints/funções).
 */
import { CREDIT_BANDS, INSTALLMENT_BANDS, findBand } from './bands.ts';

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR',
  'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;
export type UF = (typeof UFS)[number];

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export const PREFERRED_CHANNELS = ['whatsapp', 'phone', 'email'] as const;
export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];

export const LEAD_SOURCES = ['simulator', 'form', 'blog', 'home'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export function isUF(v: unknown): v is UF {
  return typeof v === 'string' && (UFS as readonly string[]).includes(v.toUpperCase());
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  // validação pragmática (RFC completa não é necessária aqui)
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(email)) return null;
  if (email.includes('..')) return null;
  return email;
}

/**
 * Normaliza telefone brasileiro para E.164 (+55DDDNÚMERO).
 * Aceita "(41) 99999-0000", "41999990000", "+55 41 99999-0000", "055 41...".
 * Celular: 9 dígitos começando com 9. Fixo: 8 dígitos começando com 2–5.
 */
export function normalizePhoneBR(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0055')) digits = digits.slice(4);
  else if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  else if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) digits = digits.slice(1);

  if (digits.length !== 10 && digits.length !== 11) return null;
  const ddd = Number(digits.slice(0, 2));
  if (!VALID_DDDS.has(ddd)) return null;
  const local = digits.slice(2);
  if (local.length === 9 && !local.startsWith('9')) return null;
  if (local.length === 8 && !/^[2-5]/.test(local)) return null;
  if (/^(\d)\1+$/.test(local)) return null; // 999999999, 00000000...
  return `+55${digits}`;
}

export function formatPhoneBR(e164: string | null | undefined): string {
  if (!e164) return '';
  const d = e164.replace(/^\+55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}

/** Remove caracteres de controle e limita tamanho. */
export function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!v) return null;
  return v.slice(0, max);
}

export function toBool(raw: unknown): boolean {
  return raw === true || raw === 'true' || raw === 'on' || raw === '1' || raw === 1;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

// -----------------------------------------------------------------------------
// Formulário de solicitação de propostas
// -----------------------------------------------------------------------------
export interface LeadFormRaw {
  [key: string]: unknown;
}

export interface LeadSubmission {
  fullName: string;
  email: string;
  phoneE164: string;
  city: string;
  state: UF;
  neighborhood: string | null;
  modalityId: string;
  creditMinCents: number | null;
  creditMaxCents: number | null;
  installmentMinCents: number | null;
  installmentMaxCents: number | null;
  termMonths: number;
  bestContactTime: string | null;
  preferredAdministratorId: string | null;
  preferredChannel: PreferredChannel;
  consentShare: true;
  consentMarketing: boolean;
  noticeVersion: string;
  source: LeadSource;
  sourcePath: string | null;
  utm: Record<string, string>;
}

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

export function validateLeadForm(raw: LeadFormRaw, allowedModalities: readonly string[]): ValidationResult<LeadSubmission> {
  const errors: Record<string, string> = {};

  const fullName = cleanText(raw.fullName, 120);
  if (!fullName || fullName.length < 3 || !/\p{L}{2,}/u.test(fullName)) errors.fullName = 'Informe seu nome.';

  const email = normalizeEmail(raw.email);
  if (!email) errors.email = 'Informe um e-mail válido.';

  const phone = normalizePhoneBR(raw.phone);
  if (!phone) errors.phone = 'Informe um telefone válido com DDD.';

  const city = cleanText(raw.city, 80);
  if (!city || city.length < 2) errors.city = 'Informe sua cidade.';

  const stateRaw = typeof raw.state === 'string' ? raw.state.trim().toUpperCase() : '';
  if (!isUF(stateRaw)) errors.state = 'Selecione o estado.';

  const modalityId = typeof raw.modality === 'string' ? raw.modality : '';
  if (!allowedModalities.includes(modalityId)) errors.modality = 'Selecione a modalidade.';

  const credit = findBand(CREDIT_BANDS, typeof raw.creditBand === 'string' ? raw.creditBand : null);
  if (!credit) errors.creditBand = 'Selecione a faixa de crédito.';

  const installment = findBand(INSTALLMENT_BANDS, typeof raw.installmentBand === 'string' ? raw.installmentBand : null);
  if (!installment) errors.installmentBand = 'Selecione a faixa de parcela.';

  const term = Number(raw.termMonths);
  if (!Number.isInteger(term) || term < 6 || term > 240) errors.termMonths = 'Selecione o prazo pretendido.';

  const channel = typeof raw.preferredChannel === 'string' ? raw.preferredChannel : '';
  if (!(PREFERRED_CHANNELS as readonly string[]).includes(channel)) errors.preferredChannel = 'Escolha o canal de contato.';

  const administrator = raw.preferredAdministratorId;
  if (administrator && administrator !== '' && !isUuid(administrator)) errors.preferredAdministratorId = 'Administradora inválida.';

  // Autorização: obrigatória, explícita, nunca pré-marcada no formulário
  if (raw.consentShare !== true && raw.consentShare !== 'true' && raw.consentShare !== 'on') {
    errors.consentShare = 'Para receber propostas, autorize o compartilhamento com consultores.';
  }
  const noticeVersion = typeof raw.noticeVersion === 'string' ? raw.noticeVersion : '';
  if (!noticeVersion) errors.noticeVersion = 'Versão do aviso de privacidade ausente. Recarregue a página.';

  const source = (LEAD_SOURCES as readonly string[]).includes(String(raw.source)) ? (raw.source as LeadSource) : 'form';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const utm: Record<string, string> = {};
  if (raw.utm && typeof raw.utm === 'object') {
    for (const [k, v] of Object.entries(raw.utm as Record<string, unknown>)) {
      if (/^utm_(source|medium|campaign|term|content)$/.test(k) && typeof v === 'string') utm[k] = v.slice(0, 100);
    }
  }

  return {
    ok: true,
    data: {
      fullName: fullName!,
      email: email!,
      phoneE164: phone!,
      city: city!,
      state: stateRaw as UF,
      neighborhood: cleanText(raw.neighborhood, 80),
      modalityId,
      creditMinCents: credit!.minCents,
      creditMaxCents: credit!.maxCents,
      installmentMinCents: installment!.minCents,
      installmentMaxCents: installment!.maxCents,
      termMonths: term,
      bestContactTime: cleanText(raw.bestContactTime, 60),
      preferredAdministratorId: isUuid(administrator) ? administrator : null,
      preferredChannel: channel as PreferredChannel,
      consentShare: true,
      consentMarketing: toBool(raw.consentMarketing),
      noticeVersion,
      source,
      sourcePath: cleanText(raw.sourcePath, 300),
      utm,
    },
  };
}

/** Verificações antispam simples e transparentes (complementam rate limit e captcha). */
export function spamSignals(raw: LeadFormRaw, nowMs: number, minFillMs = 3000): string[] {
  const signals: string[] = [];
  if (typeof raw.website === 'string' && raw.website.trim() !== '') signals.push('honeypot');
  const started = Number(raw.startedAt);
  if (!Number.isFinite(started) || started <= 0) signals.push('missing_timer');
  else if (nowMs - started < minFillMs) signals.push('too_fast');
  else if (nowMs - started > 1000 * 60 * 60 * 6) signals.push('stale_form');
  return signals;
}
