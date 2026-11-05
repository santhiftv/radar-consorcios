import { brand, emailSender, serviceRpc } from '@/lib/server/deps';
import { cronHandler } from '@/lib/server/cron';
import { logger } from '@/lib/services/log';
import { dispatchDueNotifications } from '@/lib/services/notification-dispatcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = cronHandler('dispatch_notifications', () =>
  dispatchDueNotifications({ rpc: serviceRpc(), email: emailSender(), siteUrl: brand.siteUrl, brand: brand.name, logger }),
);
