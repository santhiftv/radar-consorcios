/**
 * Processamento de webhooks de pagamento.
 * 1. Verifica a assinatura do provedor (401 se inválida).
 * 2. Registra o evento com chave de idempotência (duplicados são ignorados).
 * 3. CONSULTA o estado real na API do provedor — nunca confia no corpo do webhook
 *    nem no retorno do navegador.
 * 4. Aplica o novo estado na assinatura via função transacional.
 */
import { decideFromRecurringPayment, mapPreapprovalStatus, addMonths } from '../domain/subscription.ts';
import { PaymentProviderError, type PaymentProvider } from '../integrations/payments/types.ts';
import { silentLogger, type Logger, type Rpc, type ServiceResponse } from './types.ts';

export interface SubscriptionRow {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
}

export interface WebhookDeps {
  provider: PaymentProvider;
  rpc: Rpc;
  findSubscription: (q: { providerSubscriptionId?: string | null; internalId?: string | null }) => Promise<SubscriptionRow | null>;
  now?: () => Date;
  graceDays?: number;
  logger?: Logger;
}

const PREAPPROVAL_TYPES = new Set(['subscription_preapproval', 'preapproval']);
const PAYMENT_TYPES = new Set(['subscription_authorized_payment', 'authorized_payment']);
const ONE_TIME_PAYMENT_TYPES = new Set(['payment']);
const TOKEN_EXT_REF_PREFIX = 'tokens:';

export async function handlePaymentWebhook(
  req: { url: URL; headers: Headers; rawBody: string },
  deps: WebhookDeps,
): Promise<ServiceResponse> {
  const log = deps.logger ?? silentLogger;
  const now = deps.now?.() ?? new Date();

  const verification = deps.provider.verifyWebhook(req);
  if (!verification.valid) {
    log.warn('webhook_signature_invalid', { reason: verification.reason });
    return { status: 401, body: { error: 'invalid_signature' } };
  }

  let body: unknown = null;
  try {
    body = req.rawBody ? JSON.parse(req.rawBody) : null;
  } catch {
    body = null;
  }
  const env = deps.provider.parseWebhook({ url: req.url, body, headers: req.headers });
  if (!env) return { status: 200, body: { ignored: 'unrecognized_event' } };

  const rec = await deps.rpc<{ id: string; duplicate: boolean }>('record_payment_event', {
    p_provider: deps.provider.name,
    p_event_key: env.eventKey,
    p_event_type: env.type,
    p_resource_id: env.resourceId,
    p_payload: { type: env.type, resource_id: env.resourceId, action: (body as { action?: string } | null)?.action ?? null },
  });
  if (rec.error || !rec.data) {
    log.error('record_payment_event_failed', { code: rec.error?.code });
    return { status: 500, body: { error: 'storage_error' } };
  }
  if (rec.data.duplicate) return { status: 200, body: { duplicate: true } };
  const eventId = rec.data.id;

  const finish = (status: 'processed' | 'ignored' | 'failed', error: string | null, subscriptionId: string | null) =>
    deps.rpc('finish_payment_event', { p_id: eventId, p_status: status, p_error: error, p_subscription_id: subscriptionId });

  try {
    if (PREAPPROVAL_TYPES.has(env.type)) {
      const remote = await deps.provider.getSubscription(env.resourceId!);
      const status = mapPreapprovalStatus(remote.status);
      const row = await deps.findSubscription({ providerSubscriptionId: remote.id, internalId: remote.externalReference });
      if (!row || !status) {
        await finish('ignored', !row ? 'subscription_not_found' : `unknown_status_${remote.status}`, row?.id ?? null);
        return { status: 200, body: { ignored: true } };
      }
      // Cancelamento pedido pelo consultor: acesso segue até o fim do ciclo já pago.
      if (status === 'canceled' && row.cancel_at_period_end && row.current_period_end && new Date(row.current_period_end) > now) {
        await finish('ignored', 'scheduled_cancellation_keeps_access_until_period_end', row.id);
        return { status: 200, body: { ignored: 'scheduled_cancellation' } };
      }
      const update: Record<string, unknown> = {
        subscription_id: row.id,
        provider_subscription_id: remote.id,
        status,
        provider_status: remote.status,
      };
      // Primeira autorização: abre o primeiro ciclo (o provedor já autorizou a cobrança).
      if (status === 'active' && !row.current_period_end) {
        update.period_start = now.toISOString();
        update.period_end = addMonths(now, 1).toISOString();
        update.renew = true;
      }
      const applied = await deps.rpc('apply_subscription_update', { p: update });
      if (applied.error) throw new Error(`apply_failed:${applied.error.code ?? ''}`);
      await finish('processed', null, row.id);
      return { status: 200, body: { processed: true } };
    }

    if (PAYMENT_TYPES.has(env.type)) {
      const payment = await deps.provider.getRecurringPayment(env.resourceId!);
      const row = payment.subscriptionId ? await deps.findSubscription({ providerSubscriptionId: payment.subscriptionId }) : null;
      if (!row) {
        await finish('ignored', 'subscription_not_found', null);
        return { status: 200, body: { ignored: true } };
      }
      const decision = decideFromRecurringPayment({
        paymentStatus: payment.paymentStatus,
        paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
        current: {
          currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
          currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
        },
        now,
        graceDays: deps.graceDays,
      });
      if (!decision) {
        await finish('ignored', `payment_status_${payment.paymentStatus ?? 'unknown'}`, row.id);
        return { status: 200, body: { ignored: true } };
      }
      const applied = await deps.rpc('apply_subscription_update', {
        p: {
          subscription_id: row.id,
          status: decision.status,
          provider_status: `payment:${payment.paymentStatus}`,
          period_start: decision.periodStart?.toISOString(),
          period_end: decision.periodEnd?.toISOString(),
          grace_until: decision.graceUntil?.toISOString(),
          renew: decision.renew,
        },
      });
      if (applied.error) throw new Error(`apply_failed:${applied.error.code ?? ''}`);
      await finish('processed', null, row.id);
      return { status: 200, body: { processed: true } };
    }

    if (ONE_TIME_PAYMENT_TYPES.has(env.type) && deps.provider.getPayment) {
      const payment = await deps.provider.getPayment(env.resourceId!);
      const extRef = payment.externalReference ?? '';
      if (!extRef.startsWith(TOKEN_EXT_REF_PREFIX)) {
        await finish('ignored', 'not_token_payment', null);
        return { status: 200, body: { ignored: true } };
      }
      const purchaseId = extRef.slice(TOKEN_EXT_REF_PREFIX.length);
      if (!/^[0-9a-f-]{36}$/i.test(purchaseId)) {
        await finish('ignored', 'invalid_purchase_id', null);
        return { status: 200, body: { ignored: true } };
      }
      if (payment.status !== 'approved') {
        await finish('ignored', `token_payment_${payment.status ?? 'unknown'}`, null);
        return { status: 200, body: { ignored: true } };
      }
      const credited = await deps.rpc<boolean>('credit_token_purchase', {
        p_purchase_id: purchaseId,
        p_payment_id: payment.id,
      });
      if (credited.error) throw new Error(`credit_failed:${credited.error.code ?? ''}`);
      await finish('processed', null, null);
      return { status: 200, body: { processed: true, kind: 'token_purchase', credited: credited.data === true } };
    }

    await finish('ignored', `unhandled_type_${env.type}`, null);
    return { status: 200, body: { ignored: true } };
  } catch (e) {
    const retriable = e instanceof PaymentProviderError ? e.retriable : true;
    await finish('failed', (e as Error).message, null);
    log.error('webhook_processing_failed', { type: env.type, retriable, error: (e as Error).message });
    // 5xx faz o provedor reenviar; o evento "failed" pode ser reprocessado
    return { status: retriable ? 500 : 200, body: { error: 'processing_failed' } };
  }
}
