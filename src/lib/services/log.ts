/**
 * Logger estruturado que remove dados pessoais antes de escrever.
 * Nunca registre e-mail, telefone, nome ou tokens.
 */
import type { Logger } from './types.ts';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\+?\d[\d\s().-]{8,}\d/g;
const SENSITIVE_KEYS = /(email|phone|telefone|nome|name|token|secret|password|authorization|cpf|card)/i;

export function redactValue(v: unknown): unknown {
  if (typeof v === 'string') return v.replace(EMAIL, '[email]').replace(PHONE, '[phone]');
  if (Array.isArray(v)) return v.map(redactValue);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? '[redacted]' : redactValue(val);
    }
    return out;
  }
  return v;
}

function write(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({ level, msg: redactValue(msg), ...(meta ? { meta: redactValue(meta) } : {}), ts: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger: Logger = {
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
};
