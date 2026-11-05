/**
 * Fábrica de dependências reais dos serviços (usada pelos Route Handlers e
 * Server Actions). Nos testes, os serviços recebem dependências falsas.
 */
import { siteConfig } from '../../config/site';
import { createEditorialGenerator } from '../integrations/ai/editorial-generator';
import { createResendSender } from '../integrations/email/resend';
import { createMercadoPagoProvider } from '../integrations/payments/mercadopago';
import type { PaymentProvider } from '../integrations/payments/types';
import { createAdminClient, serviceRpc } from '../supabase/admin';
import { serverEnv } from './env';

export function emailSender() {
  return createResendSender({ apiKey: serverEnv.resendApiKey, from: serverEnv.emailFrom });
}

export function paymentProvider(): PaymentProvider {
  return createMercadoPagoProvider({
    accessToken: serverEnv.mercadoPagoAccessToken ?? '',
    webhookSecret: serverEnv.mercadoPagoWebhookSecret ?? '',
    webhookToleranceSeconds: serverEnv.mercadoPagoTolerance,
  });
}

export function editorialGenerator() {
  // Arquitetura preparada para outros provedores: hoje apenas "anthropic".
  if (serverEnv.aiProvider !== 'anthropic') return createEditorialGenerator({});
  return createEditorialGenerator({
    apiKey: serverEnv.aiApiKey,
    model: serverEnv.aiModel,
    webSearchTool: serverEnv.aiWebSearchTool,
  });
}

export const brand = { name: siteConfig.name, siteUrl: serverEnv.siteUrl };

export { createAdminClient, serviceRpc };

export function clientIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim() || null;
  return headers.get('x-real-ip');
}
