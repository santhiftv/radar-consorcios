/**
 * Mapeamento de estados do provedor de pagamento para o estado interno da
 * assinatura e cálculo de ciclos. Puro e testável.
 */

export type InternalSubscriptionStatus = 'pending' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired' | 'rejected';

/** Status de preapproval do Mercado Pago (Assinaturas). */
export function mapPreapprovalStatus(providerStatus: string | null | undefined): InternalSubscriptionStatus | null {
  switch ((providerStatus ?? '').toLowerCase()) {
    case 'pending':
      return 'pending';
    case 'authorized':
      return 'active';
    case 'paused':
      return 'paused';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    default:
      return null; // desconhecido: não altera estado
  }
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export interface PeriodState {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Novo ciclo após pagamento aprovado.
 * - Primeiro pagamento (sem ciclo): começa na data do pagamento.
 * - Renovação pontual (pagamento até o fim do ciclo + tolerância): emenda no ciclo anterior,
 *   preservando a data de aniversário.
 * - Pagamento muito atrasado: novo ciclo começa na data do pagamento.
 */
export function computeNextPeriod(current: PeriodState, paidAt: Date, toleranceDays = 7): { start: Date; end: Date } {
  if (!current.currentPeriodEnd) {
    return { start: paidAt, end: addMonths(paidAt, 1) };
  }
  // pagamento repetido do mesmo ciclo (evento duplicado com outro id): não avança
  if (current.currentPeriodStart && paidAt < current.currentPeriodEnd &&
      paidAt.getTime() - current.currentPeriodStart.getTime() < 1000 * 60 * 60 * 24 * 20) {
    return { start: current.currentPeriodStart, end: current.currentPeriodEnd };
  }
  const lateLimit = current.currentPeriodEnd.getTime() + toleranceDays * 86_400_000;
  if (paidAt.getTime() <= lateLimit) {
    const start = current.currentPeriodEnd;
    return { start, end: addMonths(start, 1) };
  }
  return { start: paidAt, end: addMonths(paidAt, 1) };
}

export function graceUntil(periodEnd: Date | null, now: Date, graceDays = 3): Date {
  const base = periodEnd && periodEnd > now ? periodEnd : now;
  return new Date(base.getTime() + graceDays * 86_400_000);
}

/**
 * Decide a atualização a partir de um pagamento recorrente (authorized payment)
 * consultado na API do provedor.
 */
export function decideFromRecurringPayment(args: {
  paymentStatus: string | null | undefined; // approved | rejected | pending | in_process | cancelled ...
  paidAt: Date | null;
  current: PeriodState;
  now: Date;
  graceDays?: number;
}): { status: InternalSubscriptionStatus; periodStart?: Date; periodEnd?: Date; graceUntil?: Date; renew: boolean } | null {
  const s = (args.paymentStatus ?? '').toLowerCase();
  if (s === 'approved' || s === 'accredited') {
    const period = computeNextPeriod(args.current, args.paidAt ?? args.now);
    const renewed = !args.current.currentPeriodEnd || period.end.getTime() !== args.current.currentPeriodEnd.getTime();
    return { status: 'active', periodStart: period.start, periodEnd: period.end, renew: renewed };
  }
  if (s === 'rejected' || s === 'cancelled' || s === 'canceled') {
    if (!args.current.currentPeriodEnd) {
      return { status: 'rejected', renew: false };
    }
    return { status: 'past_due', graceUntil: graceUntil(args.current.currentPeriodEnd, args.now, args.graceDays ?? 3), renew: false };
  }
  return null; // pendente/em processamento: aguarda próximo evento
}
