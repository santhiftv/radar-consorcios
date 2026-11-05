/** Faixas usadas em formulários e filtros (valores em centavos). */

export interface Band {
  id: string;
  label: string;
  minCents: number | null;
  maxCents: number | null;
}

export const CREDIT_BANDS: readonly Band[] = [
  { id: 'ate-50k', label: 'Até R$ 50 mil', minCents: null, maxCents: 5_000_000 },
  { id: '50k-100k', label: 'R$ 50 mil a R$ 100 mil', minCents: 5_000_000, maxCents: 10_000_000 },
  { id: '100k-200k', label: 'R$ 100 mil a R$ 200 mil', minCents: 10_000_000, maxCents: 20_000_000 },
  { id: '200k-400k', label: 'R$ 200 mil a R$ 400 mil', minCents: 20_000_000, maxCents: 40_000_000 },
  { id: '400k-700k', label: 'R$ 400 mil a R$ 700 mil', minCents: 40_000_000, maxCents: 70_000_000 },
  { id: '700k-1m', label: 'R$ 700 mil a R$ 1 milhão', minCents: 70_000_000, maxCents: 100_000_000 },
  { id: 'acima-1m', label: 'Acima de R$ 1 milhão', minCents: 100_000_000, maxCents: null },
] as const;

export const INSTALLMENT_BANDS: readonly Band[] = [
  { id: 'ate-500', label: 'Até R$ 500', minCents: null, maxCents: 50_000 },
  { id: '500-1000', label: 'R$ 500 a R$ 1.000', minCents: 50_000, maxCents: 100_000 },
  { id: '1000-2000', label: 'R$ 1.000 a R$ 2.000', minCents: 100_000, maxCents: 200_000 },
  { id: '2000-3500', label: 'R$ 2.000 a R$ 3.500', minCents: 200_000, maxCents: 350_000 },
  { id: '3500-6000', label: 'R$ 3.500 a R$ 6.000', minCents: 350_000, maxCents: 600_000 },
  { id: 'acima-6000', label: 'Acima de R$ 6.000', minCents: 600_000, maxCents: null },
] as const;

export const TERM_OPTIONS: readonly number[] = [12, 24, 36, 48, 60, 72, 80, 100, 120, 150, 180, 200, 220, 240] as const;

export function findBand(bands: readonly Band[], id: string | null | undefined): Band | undefined {
  if (!id) return undefined;
  return bands.find((b) => b.id === id);
}

/** Faixa que contém um valor (útil para pré-selecionar após a simulação). */
export function bandForValue(bands: readonly Band[], cents: number): Band | undefined {
  return bands.find((b) => (b.minCents == null || cents >= b.minCents) && (b.maxCents == null || cents <= b.maxCents));
}

export function closestTerm(months: number): number {
  let best = TERM_OPTIONS[0] ?? 12;
  for (const t of TERM_OPTIONS) {
    if (Math.abs(t - months) < Math.abs(best - months)) best = t;
  }
  return best;
}
