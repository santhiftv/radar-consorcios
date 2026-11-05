/**
 * Regras de plano espelhadas do banco (o banco é a fonte da verdade: o gatilho
 * private.enforce_preference_limits rejeita qualquer violação).
 * Aqui servem para feedback imediato na interface e para a página de planos.
 */

export type PlanFilter = 'credit' | 'installment' | 'term' | 'region' | 'administrator';

export interface PlanRules {
  code: string;
  name: string;
  priceCents: number;
  claimLimit: number;
  /** Sem teto de reivindicações por ciclo (claimLimit é ignorado). */
  claimsUnlimited: boolean;
  /** Maior urgência (0–10) de lead que o plano recebe; acima disso é exclusivo de planos superiores. */
  maxLeadUrgency: number;
  maxRegions: number | null;
  maxModalities: number | null;
  allowedModalities: string[] | null;
  allowedFilters: PlanFilter[];
  priorityDelaySeconds: number;
  reportLevel: 'basic' | 'full' | 'advanced';
  supportLevel: 'standard' | 'priority';
}

export interface PreferencesInput {
  regionIds: string[];
  modalities: string[];
  creditMinCents: number | null;
  creditMaxCents: number | null;
  installmentMinCents: number | null;
  installmentMaxCents: number | null;
  termMinMonths: number | null;
  termMaxMonths: number | null;
  administratorIds: string[];
}

export function validatePreferencesForPlan(plan: PlanRules, p: PreferencesInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (p.regionIds.length === 0) e.regionIds = 'Selecione ao menos uma região de atendimento.';
  if (plan.maxRegions != null && p.regionIds.length > plan.maxRegions) {
    e.regionIds = `Seu plano permite até ${plan.maxRegions} região(ões).`;
  }
  if (plan.maxModalities != null && p.modalities.length === 0) {
    e.modalities = 'Escolha a modalidade que deseja atender.';
  }
  if (plan.maxModalities != null && p.modalities.length > plan.maxModalities) {
    e.modalities = `Seu plano permite até ${plan.maxModalities} modalidade(s).`;
  }
  if (plan.allowedModalities) {
    const bad = p.modalities.find((m) => !plan.allowedModalities!.includes(m));
    if (bad) e.modalities = 'Modalidade não incluída no seu plano.';
  }
  const has = (f: PlanFilter) => plan.allowedFilters.includes(f);
  if (!has('credit') && (p.creditMinCents != null || p.creditMaxCents != null)) e.credit = 'Filtro de crédito não incluído no plano.';
  if (!has('installment') && (p.installmentMinCents != null || p.installmentMaxCents != null)) e.installment = 'Filtro de parcela não incluído no plano.';
  if (!has('term') && (p.termMinMonths != null || p.termMaxMonths != null)) e.term = 'Filtro de prazo não incluído no plano.';
  if (!has('administrator') && p.administratorIds.length > 0) e.administrator = 'Filtro de administradora não incluído no plano.';
  if (p.creditMinCents != null && p.creditMaxCents != null && p.creditMinCents > p.creditMaxCents) e.credit = 'Faixa de crédito inválida.';
  if (p.installmentMinCents != null && p.installmentMaxCents != null && p.installmentMinCents > p.installmentMaxCents) e.installment = 'Faixa de parcela inválida.';
  if (p.termMinMonths != null && p.termMaxMonths != null && p.termMinMonths > p.termMaxMonths) e.term = 'Faixa de prazo inválida.';
  return e;
}

/** Traduz o erro do gatilho do banco para mensagem amigável. */
export function friendlyPlanError(message: string): string {
  if (message.includes('PLAN_LIMIT_REGIONS')) return 'Você excedeu o número de regiões do seu plano.';
  if (message.includes('PLAN_LIMIT_MODALITIES')) return 'Você excedeu o número de modalidades do seu plano.';
  if (message.includes('PLAN_MODALITY_NOT_ALLOWED')) return 'Uma das modalidades não está incluída no seu plano.';
  if (message.includes('PLAN_FILTER_NOT_ALLOWED')) return 'Um dos filtros escolhidos não está incluído no seu plano.';
  return 'Não foi possível salvar as preferências.';
}

/** Texto transparente da política de prioridade, gerado a partir dos planos. */
export function describePriorityPolicy(plans: Pick<PlanRules, 'name' | 'priorityDelaySeconds'>[]): string[] {
  const sorted = [...plans].sort((a, b) => a.priorityDelaySeconds - b.priorityDelaySeconds);
  return sorted.map((p) =>
    p.priorityDelaySeconds === 0
      ? `${p.name}: acesso no momento em que a oportunidade é publicada.`
      : `${p.name}: acesso ${formatDelay(p.priorityDelaySeconds)} após a publicação, se a oportunidade ainda estiver disponível.`,
  );
}

export function formatDelay(seconds: number): string {
  if (seconds % 3600 === 0 && seconds >= 3600) return `${seconds / 3600} h`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

export function visibleAt(publishedAt: Date, plan: Pick<PlanRules, 'priorityDelaySeconds'>): Date {
  return new Date(publishedAt.getTime() + plan.priorityDelaySeconds * 1000);
}

/** Leads com urgência a partir deste valor são exclusivos do plano que aceita urgência 10. */
export const HIGH_URGENCY_MIN = 8;

export function describeClaimLimit(plan: Pick<PlanRules, 'claimLimit' | 'claimsUnlimited'>): string {
  return plan.claimsUnlimited
    ? 'Pedidos sem limite · volume estimado conforme a demanda'
    : `Até ${plan.claimLimit} pedidos por ciclo · volume conforme a demanda`;
}

export function planReceivesUrgency(plan: Pick<PlanRules, 'maxLeadUrgency'>, urgency: number): boolean {
  return urgency <= plan.maxLeadUrgency;
}
