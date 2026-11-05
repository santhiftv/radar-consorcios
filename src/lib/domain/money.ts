/** Utilidades monetárias. Todos os valores internos são inteiros em centavos. */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlNoCents = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function formatBRL(cents: number | null | undefined, opts: { cents?: boolean } = {}): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  const value = cents / 100;
  return (opts.cents === false ? brlNoCents : brl).format(value).replace(/ /g, ' ');
}

/** Formato compacto: R$ 150 mil, R$ 1,2 mi */
export function formatBRLCompact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  const reais = cents / 100;
  if (reais >= 1_000_000) {
    const v = (reais / 1_000_000).toFixed(reais % 1_000_000 === 0 ? 0 : 1).replace('.', ',');
    return `R$ ${v} mi`;
  }
  if (reais >= 1_000) {
    return `R$ ${Math.round(reais / 1_000)} mil`;
  }
  return formatBRL(cents, { cents: false });
}

export function formatRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return 'Não informado';
  if (min == null) return `até ${formatBRLCompact(max)}`;
  if (max == null) return `a partir de ${formatBRLCompact(min)}`;
  if (min === max) return formatBRLCompact(min);
  return `${formatBRLCompact(min)} – ${formatBRLCompact(max)}`;
}

/** Converte entrada do usuário ("150.000,50", "150000", "R$ 1.200") em centavos. */
export function parseBRLToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null;
  const cleaned = input.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
