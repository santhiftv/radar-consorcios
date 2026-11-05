import { NextResponse } from 'next/server';
import { serverEnv } from './env';

/** Lê JSON com limite de tamanho (evita payloads abusivos). */
export async function readJson(req: Request, maxBytes = 32_000): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > maxBytes) return null;
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** POSTs públicos devem vir do próprio site (mitiga CSRF e envios automatizados simples). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const site = new URL(serverEnv.siteUrl);
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    return o.host === site.host || (host !== null && o.host === host);
  } catch {
    return false;
  }
}

export function json(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
