import { createClient } from '@/lib/supabase/server';
import { brand, paymentProvider, serviceRpc } from '@/lib/server/deps';
import { serverEnv } from '@/lib/server/env';
import { isSameOrigin, json, readJson } from '@/lib/server/http';
import { logger } from '@/lib/services/log';

export const runtime = 'nodejs';

const TOKEN_EXT_REF_PREFIX = 'tokens:';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: 'Origem não permitida.' });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return json(401, { error: 'Faça login para comprar tokens.' });
  if (!data.user.email_confirmed_at) return json(403, { error: 'Confirme seu e-mail antes de comprar tokens.' });

  const body = await readJson(req, 1_000);
  const packageCode = typeof body?.packageCode === 'string' ? body.packageCode : '';
  if (!/^[a-z0-9_-]{2,40}$/.test(packageCode)) return json(400, { error: 'Pacote inválido.' });

  const rl = await serviceRpc()<boolean>('hit_rate_limit', {
    p_key: `tokens_checkout:${data.user.id}`,
    p_window_seconds: 300,
    p_max: 5,
  });
  if (rl.data === false) return json(429, { error: 'Muitas tentativas. Aguarde alguns minutos.' });

  const started = await serviceRpc(data.user.id)<{
    purchase_id: string;
    tokens: number;
    price_cents: number;
    package_name: string;
  }>('start_token_purchase', { p_package_code: packageCode });
  if (started.error || !started.data) {
    logger.error('start_token_purchase_failed', { code: started.error?.code });
    const msg = started.error?.message?.includes('PACKAGE_NOT_FOUND') ? 'Pacote indisponível.' : 'Não foi possível iniciar a compra.';
    return json(400, { error: msg });
  }

  try {
    const provider = paymentProvider();
    const result = await provider.createOneTimeCheckout({
      purchaseId: started.data.purchase_id,
      title: `${started.data.package_name} — Radar Consórcios`,
      priceCents: started.data.price_cents,
      payerEmail: serverEnv.mercadoPagoTestPayerEmail || data.user.email || '',
      backUrl: `${brand.siteUrl}/painel/tokens?retorno=checkout`,
      externalReferencePrefix: TOKEN_EXT_REF_PREFIX,
    });
    await serviceRpc(data.user.id)('set_token_purchase_preference', {
      p_purchase_id: started.data.purchase_id,
      p_preference_id: result.providerPreferenceId,
      p_checkout_url: result.checkoutUrl,
    });
    return json(200, { checkoutUrl: result.checkoutUrl });
  } catch (e) {
    logger.error('token_checkout_failed', { error: (e as Error).message });
    return json(502, { error: 'Falha ao criar pagamento. Tente novamente.' });
  }
}
