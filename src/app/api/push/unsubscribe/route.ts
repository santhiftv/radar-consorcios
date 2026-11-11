import { createClient } from '@/lib/supabase/server';
import { isSameOrigin, json, readJson } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: 'Origem não permitida.' });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return json(401, { error: 'Faça login.' });

  const body = await readJson(req, 2_000);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  if (!endpoint) return json(400, { error: 'endpoint ausente' });
  await supabase.from('push_subscriptions').update({ active: false }).match({ user_id: data.user.id, endpoint });
  return json(200, { ok: true });
}
