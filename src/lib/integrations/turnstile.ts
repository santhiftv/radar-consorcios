/**
 * Cloudflare Turnstile (opcional). Se TURNSTILE_SECRET_KEY não estiver
 * definido, a verificação é desativada e o antispam fica a cargo de
 * honeypot + tempo mínimo de preenchimento + rate limit.
 */
export async function verifyTurnstile(args: {
  secret?: string;
  token?: string | null;
  ip?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<{ enabled: boolean; ok: boolean; error?: string }> {
  if (!args.secret) return { enabled: false, ok: true };
  if (!args.token) return { enabled: true, ok: false, error: 'missing_token' };
  const f = args.fetchImpl ?? fetch;
  try {
    const body = new URLSearchParams({ secret: args.secret, response: args.token });
    if (args.ip) body.set('remoteip', args.ip);
    const res = await f('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    return { enabled: true, ok: data.success === true, error: data['error-codes']?.join(',') };
  } catch (e) {
    return { enabled: true, ok: false, error: `network_${(e as Error).name}` };
  }
}
