import { brand, emailSender, serviceRpc } from '@/lib/server/deps';
import { cronHandler } from '@/lib/server/cron';
import { serverEnv } from '@/lib/server/env';
import { logger } from '@/lib/services/log';
import { dispatchDueNotifications } from '@/lib/services/notification-dispatcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = cronHandler('dispatch_notifications', () =>
  dispatchDueNotifications({
    rpc: serviceRpc(),
    email: emailSender(),
    siteUrl: brand.siteUrl,
    brand: brand.name,
    vapid:
      serverEnv.vapidPublicKey && serverEnv.vapidPrivateKey
        ? { publicKey: serverEnv.vapidPublicKey, privateKey: serverEnv.vapidPrivateKey, subject: serverEnv.vapidSubject }
        : undefined,
    logger,
  }),
);
