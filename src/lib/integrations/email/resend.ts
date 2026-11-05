/**
 * E-mail transacional via API REST do Resend (sem SDK).
 * POST https://api.resend.com/emails — Authorization: Bearer <RESEND_API_KEY>
 * Cabeçalho Idempotency-Key evita envio duplicado em reprocessamentos.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;
}

export type EmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; retriable: boolean; notConfigured?: boolean };

export interface EmailSender {
  send(msg: EmailMessage): Promise<EmailResult>;
  readonly configured: boolean;
}

export function createResendSender(opts: { apiKey?: string; from?: string; fetchImpl?: typeof fetch }): EmailSender {
  const f = opts.fetchImpl ?? fetch;
  const configured = Boolean(opts.apiKey && opts.from);
  return {
    configured,
    async send(msg: EmailMessage): Promise<EmailResult> {
      if (!configured) {
        // Não simula sucesso: a entrega fica registrada como falha "não configurado".
        return { ok: false, error: 'email_provider_not_configured', retriable: false, notConfigured: true };
      }
      try {
        const res = await f('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            'Content-Type': 'application/json',
            ...(msg.idempotencyKey ? { 'Idempotency-Key': msg.idempotencyKey.slice(0, 256) } : {}),
          },
          body: JSON.stringify({ from: opts.from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, tags: msg.tags }),
        });
        const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
        if (res.ok && body.id) return { ok: true, id: body.id };
        return {
          ok: false,
          error: `resend_http_${res.status}${body.name ? `_${body.name}` : ''}`,
          retriable: res.status >= 500 || res.status === 429,
        };
      } catch (e) {
        return { ok: false, error: `resend_network_${(e as Error).name}`, retriable: true };
      }
    },
  };
}
