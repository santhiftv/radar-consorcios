/**
 * Contrato de provedor de pagamentos recorrentes. Mercado Pago é a primeira
 * implementação; outro provedor (ex.: Stripe, Pagar.me, Asaas) implementa a
 * mesma interface sem alterar o restante da aplicação.
 */

export interface CheckoutRequest {
  subscriptionId: string; // id interno (vai como external_reference)
  planName: string;
  priceCents: number;
  payerEmail: string;
  backUrl: string;
  providerPlanId?: string | null;
}

export interface CheckoutResult {
  providerSubscriptionId: string;
  checkoutUrl: string;
}

export interface ProviderSubscription {
  id: string;
  status: string | null; // status bruto do provedor
  externalReference: string | null;
  payerEmail?: string | null;
  nextPaymentDate?: string | null;
}

export interface ProviderRecurringPayment {
  id: string;
  subscriptionId: string | null;
  status: string | null; // status da cobrança
  paymentStatus: string | null; // approved | rejected | ...
  paidAt: string | null;
}

export interface WebhookEnvelope {
  eventKey: string; // chave de idempotência
  type: string; // ex.: subscription_preapproval, subscription_authorized_payment
  resourceId: string | null;
}

export interface WebhookVerification {
  valid: boolean;
  reason?: string;
}

export interface PaymentProvider {
  readonly name: 'mercadopago' | string;
  createSubscriptionCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  getRecurringPayment(paymentId: string): Promise<ProviderRecurringPayment>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  verifyWebhook(input: { headers: Headers; url: URL; rawBody: string }): WebhookVerification;
  parseWebhook(input: { url: URL; body: unknown; headers: Headers }): WebhookEnvelope | null;
}

export class PaymentProviderError extends Error {
  readonly status: number;
  readonly retriable: boolean;
  constructor(message: string, status: number, retriable: boolean) {
    super(message);
    this.name = 'PaymentProviderError';
    this.status = status;
    this.retriable = retriable;
  }
}
