import { createClient } from '@/lib/supabase/server';
import { isSameOrigin, json, readJson } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: 'Origem não permitida.' });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return json(401, { error: 'Faça login.' });

  const body = await readJson(req, 4_000);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : '';
  const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth : '';
  const userAgent = typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 500) : null;
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
