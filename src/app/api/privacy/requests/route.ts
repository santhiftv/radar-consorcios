import { brand, clientIp, emailSender, serviceRpc } from '@/lib/server/deps';
import { isSameOrigin, json, readJson } from '@/lib/server/http';
import { logger } from '@/lib/services/log';
import { createPrivacyRequest } from '@/lib/services/privacy';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: 'Origem não permitida.' });
  const body = await readJson(req, 8_000);
  if (!body) return json(400, { error: 'Requisição inválida.' });
  if (typeof body.website === 'string' && body.website) return json(200, { message: 'Verifique seu e-mail.' });

  const r = await createPrivacyRequest(
    { type: body.type, email: body.email, details: body.details, ip: clientIp(req.headers) },
    { rpc: serviceRpc(), email: emailSender(), siteUrl: brand.siteUrl, brand: brand.name, logger },
  );
  return json(r.status, r.body);
}
