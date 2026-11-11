/**
 * Gerencia o domínio de envio no Resend via API server-side. Protegido pelo
 * CRON_SECRET (mesmo header dos crons). GET lista domínios, POST cria/garante
 * o domínio e retorna os registros DNS que precisam ser criados no Registro.br,
 * PUT dispara verificação.
 */
import { timingSafeEqual } from 'node:crypto';
import { json } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOMAIN = 'radarconsorcios.com.br';
const REGION = 'us-east-1';

async function resend(method: string, path: string, body?: unknown) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY ausente');
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};
  return { status: res.status, ok: res.ok, body: parsed as Record<string, unknown> };
}

function auth(req: Request) {
  const token = process.env.ADMIN_SETUP_TOKEN;
  if (!token || token.length < 16) return false;
  const hdr = req.headers.get('authorization');
  if (!hdr) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const got = Buffer.from(hdr);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export async function GET(req: Request) {
  if (!auth(req)) return json(401, { error: 'unauthorized' });
  const list = await resend('GET', '/domains');
  return json(200, { list: list.body });
}

export async function POST(req: Request) {
  if (!auth(req)) return json(401, { error: 'unauthorized' });
  // 1) Verifica se já existe
  const list = await resend('GET', '/domains');
  const data = (list.body.data ?? []) as Array<{ id: string; name: string; status?: string }>;
  const existing = data.find((d) => d.name === DOMAIN);
  if (existing) {
    const full = await resend('GET', `/domains/${existing.id}`);
    return json(200, { kept: true, domain: full.body });
  }
  const created = await resend('POST', '/domains', { name: DOMAIN, region: REGION });
  if (!created.ok) return json(created.status, { error: 'create_failed', detail: created.body });
  return json(200, { created: true, domain: created.body });
}

export async function PUT(req: Request) {
  if (!auth(req)) return json(401, { error: 'unauthorized' });
  const list = await resend('GET', '/domains');
  const data = (list.body.data ?? []) as Array<{ id: string; name: string }>;
  const existing = data.find((d) => d.name === DOMAIN);
  if (!existing) return json(404, { error: 'not_found' });
  const verify = await resend('POST', `/domains/${existing.id}/verify`);
  const full = await resend('GET', `/domains/${existing.id}`);
  return json(200, { verify: verify.body, domain: full.body });
}
