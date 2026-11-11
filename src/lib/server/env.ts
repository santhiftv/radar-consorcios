/**
 * Leitura centralizada de variáveis de ambiente do SERVIDOR.
 * Não importe este arquivo em componentes "use client".
 */

function first(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim() !== '') return v.trim();
  }
  return undefined;
}

export const serverEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  supabaseUrl: first('NEXT_PUBLIC_SUPABASE_URL'),
  supabasePublishableKey: first('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseSecretKey: first('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
  mercadoPagoAccessToken: first('MERCADO_PAGO_ACCESS_TOKEN'),
  mercadoPagoWebhookSecret: first('MERCADO_PAGO_WEBHOOK_SECRET'),
  // Apenas homologação com credenciais de teste: e-mail do comprador de teste. NUNCA defina em produção real.
  mercadoPagoTestPayerEmail: first('MERCADO_PAGO_TEST_PAYER_EMAIL'),
  mercadoPagoTolerance: Number(process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS ?? 0) || 0,
  resendApiKey: first('RESEND_API_KEY'),
  emailFrom: first('EMAIL_FROM'),
  cronSecret: first('CRON_SECRET'),
  sheetsExportToken: first('SHEETS_EXPORT_TOKEN'),
  turnstileSecret: first('TURNSTILE_SECRET_KEY'),
  aiProvider: first('AI_PROVIDER') ?? 'anthropic',
  aiApiKey: first('AI_API_KEY'),
  aiModel: first('AI_MODEL'),
  aiWebSearchTool: first('AI_WEB_SEARCH_TOOL'),
  vapidPublicKey: first('VAPID_PUBLIC_KEY', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
  vapidPrivateKey: first('VAPID_PRIVATE_KEY'),
  vapidSubject: first('VAPID_SUBJECT') ?? 'mailto:contato@radarconsorcios.com.br',
};

/** Diagnóstico exibido no painel admin (sem revelar valores). */
export function integrationStatus() {
  return [
    { name: 'Supabase (URL + chave publicável)', ok: Boolean(serverEnv.supabaseUrl && serverEnv.supabasePublishableKey) },
    { name: 'Supabase (chave secreta no servidor)', ok: Boolean(serverEnv.supabaseSecretKey) },
    { name: 'Mercado Pago (access token)', ok: Boolean(serverEnv.mercadoPagoAccessToken) },
    { name: 'Mercado Pago (segredo do webhook)', ok: Boolean(serverEnv.mercadoPagoWebhookSecret) },
    { name: 'Resend (API key + remetente)', ok: Boolean(serverEnv.resendApiKey && serverEnv.emailFrom) },
    { name: 'Cron (CRON_SECRET ≥ 16 caracteres)', ok: Boolean(serverEnv.cronSecret && serverEnv.cronSecret.length >= 16) },
    { name: 'Google Sheets (token de exportação)', ok: Boolean(serverEnv.sheetsExportToken && serverEnv.sheetsExportToken.length >= 24), optional: true },
    { name: 'Turnstile (opcional)', ok: Boolean(serverEnv.turnstileSecret), optional: true },
    { name: 'IA editorial (opcional)', ok: Boolean(serverEnv.aiApiKey), optional: true },
  ];
}

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}
