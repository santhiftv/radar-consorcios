/**
 * Simulador ILUSTRATIVO de consórcio.
 *
 * Não usa taxas reais de nenhuma administradora. Trabalha com cenários
 * matemáticos genéricos, claramente identificados, a partir da fórmula básica:
 *
 *   parcela ≈ crédito × (1 + taxa de administração total + fundo de reserva) ÷ prazo
 *
 * Não inclui seguros, reajustes anuais do crédito (ex.: índices de correção),
 * lances, nem regras específicas de cada grupo.
 */

export type ScenarioKey = 'baixo' | 'intermediario' | 'alto';

export interface ScenarioAssumption {
  key: ScenarioKey;
  label: string;
  adminFeeTotalPct: number; // taxa de administração total sobre o crédito, no prazo todo
  reserveFundPct: number; // fundo de reserva total sobre o crédito
}

/** Parâmetros hipotéticos, editáveis pelo usuário na interface. */
export const GENERIC_SCENARIOS: readonly ScenarioAssumption[] = [
  { key: 'baixo', label: 'Cenário hipotético A (custos menores)', adminFeeTotalPct: 12, reserveFundPct: 1 },
  { key: 'intermediario', label: 'Cenário hipotético B (custos intermediários)', adminFeeTotalPct: 16, reserveFundPct: 2 },
  { key: 'alto', label: 'Cenário hipotético C (custos maiores)', adminFeeTotalPct: 22, reserveFundPct: 3 },
] as const;

export const TERM_LIMITS = { min: 6, max: 240 } as const;
export const CREDIT_LIMITS_CENTS = { min: 500_000, max: 1_000_000_000 } as const; // R$ 5 mil a R$ 10 mi

export interface SimulationInput {
  creditCents: number;
  termMonths: number;
  desiredInstallmentMinCents?: number | null;
  desiredInstallmentMaxCents?: number | null;
  scenarios?: readonly ScenarioAssumption[];
}

export interface ScenarioResult extends ScenarioAssumption {
  monthlyCents: number;
  totalPaidCents: number;
  totalCostCents: number; // total pago - crédito
  fitsDesiredRange: boolean | null;
}

export interface SimulationResult {
  ok: true;
  creditCents: number;
  termMonths: number;
  scenarios: ScenarioResult[];
  /** crédito aproximado que caberia na parcela máxima desejada, por cenário */
  creditForDesiredInstallment: Array<{ key: ScenarioKey; creditCents: number }> | null;
  notes: string[];
}

export interface SimulationError {
  ok: false;
  errors: Record<string, string>;
}

export function monthlyInstallmentCents(creditCents: number, termMonths: number, s: Pick<ScenarioAssumption, 'adminFeeTotalPct' | 'reserveFundPct'>): number {
  const factor = 1 + s.adminFeeTotalPct / 100 + s.reserveFundPct / 100;
  return Math.round((creditCents * factor) / termMonths);
}

export function creditForInstallmentCents(installmentCents: number, termMonths: number, s: Pick<ScenarioAssumption, 'adminFeeTotalPct' | 'reserveFundPct'>): number {
  const factor = 1 + s.adminFeeTotalPct / 100 + s.reserveFundPct / 100;
  return Math.floor((installmentCents * termMonths) / factor);
}

export function validateSimulationInput(input: SimulationInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Number.isInteger(input.creditCents) || input.creditCents < CREDIT_LIMITS_CENTS.min || input.creditCents > CREDIT_LIMITS_CENTS.max) {
    errors.creditCents = 'Informe um crédito entre R$ 5.000 e R$ 10.000.000.';
  }
  if (!Number.isInteger(input.termMonths) || input.termMonths < TERM_LIMITS.min || input.termMonths > TERM_LIMITS.max) {
    errors.termMonths = `Informe um prazo entre ${TERM_LIMITS.min} e ${TERM_LIMITS.max} meses.`;
  }
  const { desiredInstallmentMinCents: min, desiredInstallmentMaxCents: max } = input;
  if (min != null && (!Number.isInteger(min) || min < 0)) errors.desiredInstallmentMinCents = 'Parcela mínima inválida.';
  if (max != null && (!Number.isInteger(max) || max <= 0)) errors.desiredInstallmentMaxCents = 'Parcela máxima inválida.';
  if (min != null && max != null && min > max) errors.desiredInstallmentMaxCents = 'A parcela máxima deve ser maior que a mínima.';
  for (const s of input.scenarios ?? []) {
    if (s.adminFeeTotalPct < 0 || s.adminFeeTotalPct > 60 || s.reserveFundPct < 0 || s.reserveFundPct > 20) {
      errors.scenarios = 'Parâmetros de cenário fora de faixa plausível.';
    }
  }
  return errors;
}

export function simulate(input: SimulationInput): SimulationResult | SimulationError {
  const errors = validateSimulationInput(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const scenarios = input.scenarios && input.scenarios.length > 0 ? input.scenarios : GENERIC_SCENARIOS;
  const min = input.desiredInstallmentMinCents ?? null;
  const max = input.desiredInstallmentMaxCents ?? null;

  const results: ScenarioResult[] = scenarios.map((s) => {
    const monthly = monthlyInstallmentCents(input.creditCents, input.termMonths, s);
    const total = monthly * input.termMonths;
    const fits = min == null && max == null ? null : (min == null || monthly >= min) && (max == null || monthly <= max);
    return { ...s, monthlyCents: monthly, totalPaidCents: total, totalCostCents: total - input.creditCents, fitsDesiredRange: fits };
  });

  const notes: string[] = [
    'Cenários genéricos e hipotéticos — não representam taxas de nenhuma administradora.',
    'Não inclui seguros, reajuste anual do crédito, lances ou outras condições do contrato.',
    'Não há garantia de contemplação em data específica.',
  ];
  if (results.every((r) => r.fitsDesiredRange === false)) {
    notes.push('A parcela desejada não se encaixa nos cenários ilustrativos com este crédito e prazo. Experimente ajustar o prazo ou o crédito.');
  }

  return {
    ok: true,
    creditCents: input.creditCents,
    termMonths: input.termMonths,
    scenarios: results,
    creditForDesiredInstallment:
      max != null ? scenarios.map((s) => ({ key: s.key, creditCents: creditForInstallmentCents(max, input.termMonths, s) })) : null,
    notes,
  };
}
