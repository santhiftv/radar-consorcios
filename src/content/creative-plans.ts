/** Planos de criativos e vídeos para Instagram. Valores em reais por mês. */

export interface CreativeTier {
  /** Quantidade por semana */
  perWeek: number;
  /** Quantidade por mês (4 semanas) */
  perMonth: number;
  price: number;
}

export const CREATIVE_TIERS: CreativeTier[] = [
  { perWeek: 1, perMonth: 4, price: 97 },
  { perWeek: 2, perMonth: 8, price: 167 },
  { perWeek: 4, perMonth: 16, price: 297 },
];

export const VIDEO_TIERS: CreativeTier[] = [
  { perWeek: 1, perMonth: 4, price: 197 },
  { perWeek: 2, perMonth: 8, price: 347 },
  { perWeek: 4, perMonth: 16, price: 597 },
];

export const COMBO_TIERS: CreativeTier[] = [
  { perWeek: 1, perMonth: 4, price: 247 },
  { perWeek: 2, perMonth: 8, price: 437 },
  { perWeek: 4, perMonth: 16, price: 747 },
];

/** Mensalidade Profissional + combo (valor com desconto sobre a soma). */
export const PRO_COMBO_TIERS: CreativeTier[] = [
  { perWeek: 1, perMonth: 4, price: 797 },
  { perWeek: 2, perMonth: 8, price: 947 },
  { perWeek: 4, perMonth: 16, price: 1197 },
];

export const PRO_PRICE = 597;
export const SINGLE_CREATIVE_PRICE = 35;
export const SINGLE_VIDEO_PRICE = 79;

export function brl(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`;
}
