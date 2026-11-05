import { serviceRpc } from '@/lib/server/deps';
import { cronHandler } from '@/lib/server/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = cronHandler('retention', async () => {
  const r = await serviceRpc()('apply_retention');
  if (r.error) throw new Error(r.error.message);
  return r.data;
});
