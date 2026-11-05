import { after } from 'next/server';
import { leadReceivedEmail } from '@/lib/integrations/email/templates';
import { verifyTurnstile } from '@/lib/integrations/turnstile';
import { MAX_CONSULTANTS_PER_LEAD } from '@/content/legal';
import { brand, clientIp, createAdminClient, emailSender, serviceRpc } from '@/lib/server/deps';
import { serverEnv } from '@/lib/server/env';
import { isSameOrigin, json, readJson } from '@/lib/server/http';
import { logger } from '@/lib/services/log';
import { processLeadSubmission } from '@/lib/services/lead-intake';
import { dispatchDueNotifications } from '@/lib/services/notification-dispatcher';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: 'Origem não permitida.' });
  const body = await readJson(req);
  if (!body) return json(400, { error: 'Requisição inválida.' });

  const ip = clientIp(req.headers);
  const rpc = serviceRpc();
  const email = emailSender();

  const result = await processLeadSubmission(body, { ip }, {
    rpc,
    logger,
    listActiveModalities: async () => {
      const { data } = await createAdminClient().from('modalities').select('id').eq('active', true);
      return (data ?? []).map((m: { id: string }) => m.id);
    },
    verifyCaptcha: (token, ipAddr) => verifyTurnstile({ secret: serverEnv.turnstileSecret, token, ip: ipAddr }),
    onCreated: async ({ email: to, firstName }) => {
      const msg = leadReceivedEmail({ brand: brand.name, siteUrl: brand.siteUrl, firstName, maxConsultants: MAX_CONSULTANTS_PER_LEAD });
      const sent = await email.send({ to, ...msg });
      if (!sent.ok) logger.warn('lead_receipt_email_not_sent', { error: sent.error });
    },
  });

  if (result.status === 201) {
    // Entrega imediata das notificações do Premium (janela 0) sem esperar o cron
    after(async () => {
      try {
        await dispatchDueNotifications({ rpc, email, siteUrl: brand.siteUrl, brand: brand.name, maxBatches: 1, logger });
      } catch (e) {
        logger.error('inline_dispatch_failed', { error: (e as Error).message });
      }
    });
  }
  return json(result.status, result.body);
}
