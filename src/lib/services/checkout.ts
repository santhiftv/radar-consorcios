/**
 * Início do checkout de assinatura. Cria a assinatura PENDENTE no banco e o
 * link de pagamento no provedor. Benefícios só são liberados pelo webhook.
 */
import type { PaymentProvider } from '../integrations/payments/types.ts';
import { businessCode, silentLogger, type Logger, type Rpc, type ServiceResponse } from './types.ts';

export interface CheckoutDeps {
  rpc: Rpc; // service_role
  provider: PaymentProvider;
  siteUrl: string;
  logger?: Logger;
  /** SOMENTE homologação: e-mail do comprador de teste do Mercado Pago (credenciais de teste exigem pagador de teste). */
  testPayerEmail?: string;
}

const MESSAGES: Record<string, string> = {
  PROFILE_INCOMPLETE: 'Complete seu perfil profissional antes de assinar.',
  TERMS_NOT_ACCEPTED: 'Aceite os termos do consultor antes de assinar.',
  PROFILE_BLOCKED: 'Sua conta está bloqueada para novas assinaturas. Fale com o suporte.',
  PLAN_NOT_FOUND: 'Plano indisponível.',
  SUBSCRIPTION_ALREADY_ACTIVE: 'Você já possui uma assinatura ativa. Para trocar de plano, fale com o suporte.',
};

export async function startCheckout(
  input: { consultantId: string; email: string; planCode: string },
  deps: CheckoutDeps,
): Promise<ServiceResponse<{ checkoutUrl?: string; error?: string }>> {
  const log = deps.logger ?? silentLogger;
  const started = await deps.rpc<{
    subscription_id: string;
    plan_name: string;
    price_cents: number;
    provider_plan_id: string | null;
    superseded_provider_id: string | null;
    rejected_provider_ids?: string[];
  }>('start_subscription_checkout', { p_consultant: input.consultantId, p_plan_code: input.planCode });

  if (started.error || !started.data) {
    const code = businessCode(started.error);
    return { status: 400, body: { error: (code && MESSAGES[code]) || 'Não foi possível iniciar a assinatura.' } };
  }

  const s = started.data;
  // checkouts anteriores abandonados ou recusados: cancela no provedor (melhor esforço)
  for (const old of [s.superseded_provider_id, ...(s.rejected_provider_ids ?? [])]) {
    if (!old) continue;
    deps.provider.cancelSubscription(old).catch((e: Error) => log.warn('cancel_superseded_failed', { error: e.message }));
  }

  try {
    const checkout = await deps.provider.createSubscriptionCheckout({
      subscriptionId: s.subscription_id,
      planName: s.plan_name,
      priceCents: s.price_cents,
      payerEmail: deps.testPayerEmail || input.email,
      backUrl: `${deps.siteUrl}/painel/assinatura?retorno=checkout`,
      providerPlanId: s.provider_plan_id,
    });
    const saved = await deps.rpc('set_subscription_checkout', {
      p_subscription_id: s.subscription_id,
      p_provider_id: checkout.providerSubscriptionId,
      p_checkout_url: checkout.checkoutUrl,
    });
    if (saved.error) throw new Error(`save_checkout_failed:${saved.error.code ?? ''}`);
    return { status: 200, body: { checkoutUrl: checkout.checkoutUrl } };
  } catch (e) {
    log.error('checkout_provider_failed', { error: (e as Error).message });
    return { status: 502, body: { error: 'O provedor de pagamento não respondeu. Tente novamente em instantes.' } };
  }
}
