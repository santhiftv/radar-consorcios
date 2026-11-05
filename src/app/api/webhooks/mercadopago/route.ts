import { createAdminClient, paymentProvider, serviceRpc } from '@/lib/server/deps';
import { json } from '@/lib/server/http';
import { logger } from '@/lib/services/log';
import { handlePaymentWebhook, type SubscriptionRow } from '@/lib/services/payment-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook do Mercado Pago (Assinaturas). Configure no painel do Mercado Pago:
 *   URL: https://SEU_DOMINIO/api/webhooks/mercadopago
 *   Eventos: Planos e assinaturas (subscription_preapproval, subscription_authorized_payment)
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (rawBody.length > 64_000) return json(413, { error: 'payload_too_large' });

  const admin = createAdminClient();
  const result = await handlePaymentWebhook(
    { url: new URL(req.url), headers: req.headers, rawBody },
    {
      provider: paymentProvider(),
      rpc: serviceRpc(),
      logger,
      findSubscription: async ({ providerSubscriptionId, internalId }) => {
        if (providerSubscriptionId) {
          const { data } = await admin
            .from('subscriptions')
            .select('id, status, current_period_start, current_period_end, cancel_at_period_end')
            .eq('provider_subscription_id', providerSubscriptionId)
            .maybeSingle();
          if (data) return data as SubscriptionRow;
        }
        if (internalId && /^[0-9a-f-]{36}$/i.test(internalId)) {
          const { data } = await admin
            .from('subscriptions')
            .select('id, status, current_period_start, current_period_end, cancel_at_period_end')
            .eq('id', internalId)
            .maybeSingle();
          if (data) return data as SubscriptionRow;
        }
        return null;
      },
    },
  );
  return json(result.status, result.body);
}
