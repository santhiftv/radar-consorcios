import { createClient } from '@/lib/supabase/server';
import { isSameOrigin, json, readJson } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: 'Origem não permitida.' });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return json(401, { error: 'Faça login.' });

  const raw = (await readJson(req, 4_000)) as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
    userAgent?: unknown;
  } | null;
  const endpoint = typeof raw?.endpoint === 'string' ? raw.endpoint : '';
  const p256dh = typeof raw?.keys?.p256dh === 'string' ? raw.keys.p256dh : '';
  const auth = typeof raw?.keys?.auth === 'string' ? raw.keys.auth : '';
  const userAgent = typeof raw?.userAgent === 'string' ? raw.userAgent.slice(0, 500) : null;
  if (!endpoint || !p256dh || !auth) return json(400, { error: 'subscription inválida' });

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: data.user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  );
  if (error) return json(500, { error: 'falha ao salvar' });
  return json(200, { ok: true });
}
