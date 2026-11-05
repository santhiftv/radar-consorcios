import { serviceRpc } from '@/lib/server/deps';
import { cronHandler } from '@/lib/server/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Expira atribuições sem atendimento (com redistribuição) e assinaturas vencidas. */
export const GET = cronHandler('expire', async () => {
  const rpc = serviceRpc();
  const assignments = await rpc('expire_stale_assignments');
  if (assignments.error) throw new Error(`expire_stale_assignments: ${assignments.error.message}`);
  const subscriptions = await rpc('expire_subscriptions');
  if (subscriptions.error) throw new Error(`expire_subscriptions: ${subscriptions.error.message}`);
  return { assignments: assignments.data, subscriptions: subscriptions.data };
});
