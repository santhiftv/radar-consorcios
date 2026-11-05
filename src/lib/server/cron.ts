import { json } from './http';
import { serverEnv } from './env';
import { isAuthorizedCron } from '../services/cron-auth';
import { logger } from '../services/log';

/** Envolve um job de cron com autenticação por CRON_SECRET e log estruturado. */
export function cronHandler(name: string, job: () => Promise<unknown>) {
  return async function GET(req: Request) {
    if (!isAuthorizedCron(req.headers.get('authorization'), serverEnv.cronSecret)) {
      return json(401, { error: 'unauthorized' });
    }
    const started = Date.now();
    try {
      const result = await job();
      logger.info(`cron_${name}_ok`, { ms: Date.now() - started, result: result as Record<string, unknown> });
      return json(200, { ok: true, result });
    } catch (e) {
      logger.error(`cron_${name}_failed`, { error: (e as Error).message });
      return json(500, { ok: false, error: (e as Error).message });
    }
  };
}
