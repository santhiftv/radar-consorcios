/**
 * Dispatcher da fila de notificações (executado por cron a cada minuto e
 * logo após eventos importantes). Seguro para execuções concorrentes: o banco
 * entrega cada item a um único processo (FOR UPDATE SKIP LOCKED).
 */
import type { EmailSender } from '../integrations/email/resend.ts';
import { notificationEmail } from '../integrations/email/templates.ts';
import { sendWebPush, type PushSubscriptionInput } from '../integrations/webpush.ts';
import { silentLogger, type Logger, type Rpc } from './types.ts';

export interface DueDelivery {
  delivery_id: string;
  channel: 'email' | 'inapp' | 'push';
  attempts: number;
  notification_id: string;
  recipient_id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  lead_id: string | null;
  lead_status: string | null;
}

export interface DispatcherDeps {
  rpc: Rpc;
  email: EmailSender;
  siteUrl: string;
  brand: string;
  vapid?: { publicKey: string; privateKey: string; subject: string };
  batchSize?: number;
  maxBatches?: number;
  logger?: Logger;
}

export interface DispatchReport {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

export async function dispatchDueNotifications(deps: DispatcherDeps): Promise<DispatchReport> {
  const log = deps.logger ?? silentLogger;
  const report: DispatchReport = { processed: 0, sent: 0, failed: 0, skipped: 0 };

  for (let batch = 0; batch < (deps.maxBatches ?? 5); batch++) {
    const { data, error } = await deps.rpc<DueDelivery[]>('claim_due_deliveries', { p_limit: deps.batchSize ?? 50 });
    if (error) {
      log.error('claim_due_deliveries_failed', { code: error.code });
      // Falha de acesso ao banco precisa aparecer como erro do cron (HTTP 500), não como "0 processados"
      throw new Error(`claim_due_deliveries_failed${error.code ? `: ${error.code}` : ''}`);
    }
    const items = data ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      report.processed++;
      let outcome: 'sent' | 'failed' | 'skipped';
      let providerId: string | null = null;
      let err: string | null = null;

      if (item.type === 'new_lead' && item.lead_status !== 'open') {
        outcome = 'skipped';
        err = 'lead_no_longer_available';
      } else if (item.channel === 'inapp') {
        outcome = 'sent'; // a notificação já está no banco; o "envio" é o broadcast em tempo real
      } else if (item.channel === 'push') {
        if (!deps.vapid) {
          outcome = 'skipped';
          err = 'vapid_not_configured';
        } else {
          const subsRes = await deps.rpc<Array<PushSubscriptionInput & { id: string }>>('list_push_subscriptions', {
            p_user: item.recipient_id,
          });
          const subs = subsRes.data ?? [];
          if (subs.length === 0) {
            outcome = 'skipped';
            err = 'no_push_subscriptions';
          } else {
            let anyOk = false;
            let lastErr: string | null = null;
            for (const s of subs) {
              const r = await sendWebPush(
                { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
                {
                  title: item.title,
                  body: item.body,
                  tag: `lead-${item.lead_id ?? item.notification_id}`,
                  url: item.lead_id ? `/painel/novos-leads?lead=${item.lead_id}` : '/painel',
                  urgent: item.type === 'new_lead',
                },
                { publicKeyB64: deps.vapid.publicKey, privateKeyB64: deps.vapid.privateKey, subject: deps.vapid.subject },
              );
              if (r.ok) anyOk = true;
              else if (r.gone) await deps.rpc('deactivate_push_subscription', { p_id: s.id });
              else lastErr = `push_${r.status}${r.error ? `:${r.error.slice(0, 80)}` : ''}`;
            }
            if (anyOk) outcome = 'sent';
            else {
              outcome = 'failed';
              err = lastErr ?? 'push_all_gone';
            }
          }
        }
      } else if (!item.recipient_email) {
        outcome = 'skipped';
        err = 'recipient_without_email';
      } else {
        const msg = notificationEmail({
          brand: deps.brand,
          siteUrl: deps.siteUrl,
          type: item.type,
          title: item.title,
          body: item.body,
          leadId: item.lead_id,
        });
        const res = await deps.email.send({
          to: item.recipient_email,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          idempotencyKey: `delivery-${item.delivery_id}-${item.attempts}`,
          tags: [{ name: 'type', value: item.type }],
        });
        if (res.ok) {
          outcome = 'sent';
          providerId = res.id;
        } else {
          outcome = 'failed';
          err = res.error;
        }
      }

      const done = await deps.rpc('complete_delivery', {
        p_delivery_id: item.delivery_id,
        p_outcome: outcome,
        p_provider_message_id: providerId,
        p_error: err,
      });
      if (done.error) log.error('complete_delivery_failed', { deliveryId: item.delivery_id, code: done.error.code });
      report[outcome === 'sent' ? 'sent' : outcome === 'failed' ? 'failed' : 'skipped']++;
    }
    if (items.length < (deps.batchSize ?? 50)) break;
  }

  if (report.processed > 0) log.info('notifications_dispatched', { ...report });
  return report;
}
