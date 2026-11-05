/**
 * Classificação da oportunidade a partir APENAS do que o titular informou.
 * Não usa dados externos, não infere renda e não completa lacunas.
 */
import type { LeadSubmission } from './validation.ts';
import { GENERIC_SCENARIOS, monthlyInstallmentCents } from './simulator.ts';

export interface LeadQuality {
  score: number; // 0–100
  tier: 'A' | 'B' | 'C';
  reasons: string[];
}

export function classifyLead(lead: Pick<LeadSubmission,
  'creditMinCents' | 'creditMaxCents' | 'installmentMinCents' | 'installmentMaxCents' | 'termMonths' |
  'neighborhood' | 'bestContactTime' | 'preferredAdministratorId'>): LeadQuality {
  let score = 50;
  const reasons: string[] = [];

  // Coerência entre crédito, prazo e parcela desejada (cenário intermediário genérico)
  const creditRef = lead.creditMaxCents ?? lead.creditMinCents;
  const mid = GENERIC_SCENARIOS[1]!;
  if (creditRef != null && (lead.installmentMaxCents != null || lead.installmentMinCents != null)) {
    const expected = monthlyInstallmentCents(lead.creditMinCents ?? creditRef, lead.termMonths, mid);
    const maxOk = lead.installmentMaxCents == null || expected <= lead.installmentMaxCents * 1.25;
    const minOk = lead.installmentMinCents == null || monthlyInstallmentCents(creditRef, lead.termMonths, mid) >= lead.installmentMinCents * 0.75;
    if (maxOk && minOk) {
      score += 25;
      reasons.push('Crédito, prazo e parcela coerentes');
    } else {
      score -= 15;
      reasons.push('Parcela desejada pouco compatível com crédito e prazo informados');
    }
  }

  if (lead.neighborhood) {
    score += 5;
    reasons.push('Bairro informado');
  }
  if (lead.bestContactTime) {
    score += 10;
    reasons.push('Melhor horário de contato informado');
  }
  if (lead.preferredAdministratorId) {
    score += 5;
    reasons.push('Preferência de administradora informada');
  }

  score = Math.max(0, Math.min(100, score));
  const tier = score >= 75 ? 'A' : score >= 55 ? 'B' : 'C';
  return { score, tier, reasons };
}
