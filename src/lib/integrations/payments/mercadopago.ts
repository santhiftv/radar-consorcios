/**
 * Mercado Pago — Assinaturas (preapproval) via API REST, sem SDK.
 *
 * Referências (confirme na documentação vigente antes de ir para produção):
 *  - POST https://api.mercadopago.com/preapproval  (assinatura sem plano, status "pending")
 *  - GET  https://api.mercadopago.com/preapproval/{id}
 *  - GET  https://api.mercadopago.com/authorized_payments/{id}
 *  - PUT  https://api.mercadopago.com/preapproval/{id}  { status: "cancelled" }
 *  - Webhooks: cabeçalhos x-signature ("ts=...,v1=...") e x-request-id;
 *    manifesto "id:{data.id};request-id:{x-request-id};ts:{ts};" assinado com
 *    HMAC-SHA256 usando a "assinatura secreta" configurada no painel.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  PaymentProviderError,
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type ProviderRecurringPayment,
  type ProviderSubscription,
  type WebhookEnvelope,
  type WebhookVerification,
} from './types.ts';

const API = 'https://api.mercadopago.com';

export interface MercadoPagoOptions {
  accessToken: string;
  webhookSecret: string;
  fetchImpl?: typeof fetch;
  /** Tolerância de relógio para o "ts" da assinatura (segundos). 0 = desativado. */
  webhookToleranceSeconds?: number;
  now?: () => number;
}

/** Monta o manifesto omitindo partes ausentes, como na documentação oficial. */
export function buildSignatureManifest(dataId: string | null, requestId: string | null, ts: string): string {
  let manifest = '';
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}

export function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  let ts = '';
  let v1 = '';
  for (const part of header.split(',')) {
    const [k, v] = part.split('=').map((s) => s.trim());
    if (k === 'ts' && v) ts = v;
    if (k === 'v1' && v) v1 = v;
  }
  return ts && v1 ? { ts, v1 } : null;
}

export function verifyMercadoPagoSignature(args: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  toleranceSeconds?: number;
  nowMs?: number;
}): WebhookVerification {
  if (!args.secret) return { valid: false, reason: 'secret_not_configured' };
  const parsed = parseSignatureHeader(args.signatureHeader);
  if (!parsed) return { valid: false, reason: 'missing_signature' };

  if (args.toleranceSeconds && args.toleranceSeconds > 0) {
    const tsNum = Number(parsed.ts);
    const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
    if (!Number.isFinite(tsMs) || Math.abs((args.nowMs ?? Date.now()) - tsMs) > args.toleranceSeconds * 1000) {
      return { valid: false, reason: 'timestamp_out_of_tolerance' };
    }
  }

  const manifest = buildSignatureManifest(args.dataId, args.requestId, parsed.ts);
  const expected = createHmac('sha256', args.secret).update(manifest).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(parsed.v1, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: 'signature_mismatch' };
  return { valid: true };
}

function dataIdFrom(url: URL, body: unknown): string | null {
  const q = url.searchParams.get('data.id') ?? url.searchParams.get('id');
  if (q) return q;
  if (body && typeof body === 'object') {
    const data = (body as { data?: { id?: unknown } }).data;
    if (data && (typeof data.id === 'string' || typeof data.id === 'number')) return String(data.id);
  }
  return null;
}

export function createMercadoPagoProvider(opts: MercadoPagoOptions): PaymentProvider {
  const f = opts.fetchImpl ?? fetch;

  async function call<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    if (!opts.accessToken) throw new PaymentProviderError('MERCADO_PAGO_ACCESS_TOKEN não configurado', 0, false);
    const res = await f(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      // Nunca propaga o corpo bruto (pode conter dados do pagador)
      let code = '';
      try {
        code = String((JSON.parse(text) as { error?: string; message?: string }).error ?? '');
      } catch {
        /* ignore */
      }
      throw new PaymentProviderError(`Mercado Pago ${method} ${path.split('/')[1]} falhou: HTTP ${res.status} ${code}`.trim(),
        res.status, res.status >= 500 || res.status === 429);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  return {
    name: 'mercadopago',

    async createSubscriptionCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
      // Fluxo "assinatura sem plano associado" com pagamento pendente: o assinante
      // conclui o pagamento no init_point do Mercado Pago.
      const data = await call<{ id: string; init_point?: string; sandbox_init_point?: string }>(
        'POST',
        '/preapproval',
        {
          reason: `Consórcio Intel — Plano ${req.planName}`,
          external_reference: req.subscriptionId,
          payer_email: req.payerEmail,
          back_url: req.backUrl,
          status: 'pending',
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: Math.round(req.priceCents) / 100,
            currency_id: 'BRL',
          },
        },
        req.subscriptionId,
      );
      const url = data.init_point ?? data.sandbox_init_point;
      if (!data.id || !url) throw new PaymentProviderError('Resposta do Mercado Pago sem id/init_point', 502, true);
      return { providerSubscriptionId: data.id, checkoutUrl: url };
    },

    async getSubscription(id: string): Promise<ProviderSubscription> {
      const d = await call<{ id: string; status?: string; external_reference?: string; payer_email?: string; next_payment_date?: string }>(
        'GET', `/preapproval/${encodeURIComponent(id)}`);
      return {
        id: d.id,
        status: d.status ?? null,
        externalReference: d.external_reference ?? null,
        payerEmail: d.payer_email ?? null,
        nextPaymentDate: d.next_payment_date ?? null,
      };
    },

    async getRecurringPayment(id: string): Promise<ProviderRecurringPayment> {
      const d = await call<{
        id: number | string;
        preapproval_id?: string;
        status?: string;
        payment?: { id?: number; status?: string };
        debit_date?: string;
        last_modified?: string;
        date_created?: string;
      }>('GET', `/authorized_payments/${encodeURIComponent(id)}`);
      return {
        id: String(d.id),
        subscriptionId: d.preapproval_id ?? null,
        status: d.status ?? null,
        paymentStatus: d.payment?.status ?? null,
        paidAt: d.last_modified ?? d.debit_date ?? d.date_created ?? null,
      };
    },

    async cancelSubscription(id: string): Promise<void> {
      await call('PUT', `/preapproval/${encodeURIComponent(id)}`, { status: 'cancelled' });
    },

    verifyWebhook({ headers, url, rawBody }): WebhookVerification {
      let body: unknown = null;
      try {
        body = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        /* corpo não-JSON: segue com a query string */
      }
      return verifyMercadoPagoSignature({
        secret: opts.webhookSecret,
        signatureHeader: headers.get('x-signature'),
        requestId: headers.get('x-request-id'),
        dataId: dataIdFrom(url, body),
        toleranceSeconds: opts.webhookToleranceSeconds,
        nowMs: opts.now?.(),
      });
    },

    parseWebhook({ url, body, headers }): WebhookEnvelope | null {
      const b = (body && typeof body === 'object' ? body : {}) as { id?: unknown; type?: unknown; topic?: unknown; action?: unknown };
      const type = String(url.searchParams.get('type') ?? url.searchParams.get('topic') ?? b.type ?? b.topic ?? '');
      const resourceId = dataIdFrom(url, body);
      if (!type || !resourceId) return null;
      const notificationId = b.id != null ? String(b.id) : headers.get('x-request-id') ?? '';
      return {
        type,
        resourceId,
        eventKey: [type, resourceId, String(b.action ?? ''), notificationId].join(':'),
      };
    },
  };
}
