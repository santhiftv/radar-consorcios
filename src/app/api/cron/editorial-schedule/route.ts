import { serviceRpc } from '@/lib/server/deps';
import { cronHandler } from '@/lib/server/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cria a pauta da próxima semana (4 slots conforme o calendário editorial). */
export const GET = cronHandler('editorial_schedule', async () => {
  const r = await serviceRpc()<number>('schedule_editorial_week', {});
  if (r.error) throw new Error(r.error.message);
  return { jobs_created: r.data };
});
