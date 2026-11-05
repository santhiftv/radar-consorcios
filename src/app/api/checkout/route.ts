import { createClient } from '@/lib/supabase/server';
import { brand, paymentProvider, serviceRpc } from '@/lib/server/deps';
import { serverEnv } from '@/lib/server/env';
import { isSameOrigin, json, readJson } from '@/lib/server/http';
import { startCheckout } from '@/lib/services/checkout';
import { logger } from '@/lib/services/log';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: 'Origem não permitida.' });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return json(401, { error: 'Faça login para assinar.' });
  if (!data.user.email_confirmed_at) return json(403, { error: 'Confirme seu e-mail antes de assinar.' });

  const body = await readJson(req, 2_000);
  const planCode = typeof body?.planCode === 'string' ? body.planCode : '';
  if (!/^[a-z0-9_-]{2,40}$/.test(planCode)) return json(400, { error: 'Plano inválido.' });

  const rl = await serviceRpc()<boolean>('hit_rate_limit', { p_key: `checkout:${data.user.id}`, p_window_seconds: 600, p_max: 5 });
  if (rl.data === false) return json(429, { error: 'Muitas tentativas. Aguarde alguns minutos.' });

  const r = await startCheckout(
    { consultantId: data.user.id, email: data.user.email ?? '', planCode },
    { rpc: serviceRpc(data.user.id), provider: paymentProvider(), siteUrl: brand.siteUrl, logger, testPayerEmail: serverEnv.mercadoPagoTestPayerEmail },
  );
  return json(r.status, r.body);
}
