/**
 * Dispatcher da fila de notificações (executado por cron a cada minuto e
 * logo após eventos importantes). Seguro para execuções concorrentes: o banco
 * entrega cada item a um único processo (FOR UPDATE SKIP LOCKED).
 */
import type { EmailSender } from '../integrations/email/resend.ts';
import { notificationEmail } from '../integrations/email/templates.ts';
import { silentLogger, type Logger, type Rpc } from './types.ts';

export interface DueDelivery {
  delivery_id: string;
  channel: 'email' | 'inapp';
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
