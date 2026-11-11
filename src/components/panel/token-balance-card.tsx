import Link from 'next/link';
import { Card } from '@/components/ui';

interface Balance {
  weekly_balance: number;
  weekly_quota: number;
  extra_balance: number;
  next_reset_at?: string | null;
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function TokenBalanceCard({ balance }: { balance: Balance }) {
  const total = (balance.weekly_balance ?? 0) + (balance.extra_balance ?? 0);
  const quota = balance.weekly_quota ?? 0;
  const low = total === 0;
  return (
    <Card className={`p-5 ${low ? 'border-amber-200 bg-amber-50' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Tokens de reivindicação</h3>
          <p className="mt-1 text-3xl font-extrabold text-navy-900">
            {total} <span className="text-lg font-semibold text-muted">disponíveis</span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-navy-900">
            <li>
              <span className="font-semibold">{balance.weekly_balance}</span>/{quota} desta semana
            </li>
            <li>
              <span className="font-semibold">{balance.extra_balance}</span> extras (comprados)
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted">
            1 token = 1 reivindicação. A cota semanal reseta toda segunda-feira
            {balance.next_reset_at ? ` (${formatDate(balance.next_reset_at)})` : ''}. Tokens não acumulam.
          </p>
        </div>
        <Link
          href="/painel/tokens"
          className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          {low ? 'Comprar tokens' : 'Gerenciar tokens'}
        </Link>
      </div>
    </Card>
  );
}
