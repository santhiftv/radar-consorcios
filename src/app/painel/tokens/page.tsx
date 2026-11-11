import { Alert, Card, PageTitle, formatDateTime } from '@/components/ui';
import { TokenBalanceCard } from '@/components/panel/token-balance-card';
import { BuyTokenButton } from '@/components/panel/buy-token-button';
import { requireConsultant } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tokens e saldo' };

interface TokenPackage {
  id: string;
  code: string;
  name: string;
  tokens: number;
  price_cents: number;
  validity_days: number;
}

interface LedgerEntry {
  id: number;
  type: string;
  amount: number;
  weekly_after: number;
  extra_after: number;
  note: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  grant_weekly: 'Cota semanal creditada',
  grant_purchase: 'Compra de pacote',
  grant_refund: 'Reembolso por contestação',
  consume_claim: 'Reivindicação de lead',
  expire_weekly: 'Reset semanal (tokens não acumulam)',
  adjust: 'Ajuste manual',
};

export default async function TokensPage({ searchParams }: { searchParams: Promise<{ retorno?: string }> }) {
  const { retorno } = await searchParams;
  const { supabase } = await requireConsultant();
  const [balanceRes, packagesRes, ledgerRes] = await Promise.all([
    supabase.rpc('token_balance'),
    supabase.rpc('list_token_packages'),
    supabase.rpc('list_token_ledger', { p_limit: 30 }),
  ]);
  const balance = (balanceRes.data ?? { weekly_balance: 0, weekly_quota: 0, extra_balance: 0 }) as {
    weekly_balance: number;
    weekly_quota: number;
    extra_balance: number;
    week_start_at: string;
    next_reset_at: string;
  };
  const packages = (packagesRes.data ?? []) as TokenPackage[];
  const ledger = (ledgerRes.data ?? []) as LedgerEntry[];

  return (
    <>
      <PageTitle
        title="Tokens e saldo"
        description="Cada reivindicação de lead consome 1 token. O plano concede uma cota semanal; tokens avulsos cobrem a demanda extra."
      />

      {retorno === 'checkout' && (
        <Alert tone="neutral" className="mb-4" title="Pagamento em processamento">
          O Mercado Pago está processando sua compra. Assim que for aprovada, os tokens aparecem automaticamente no seu saldo.
        </Alert>
      )}

      <TokenBalanceCard balance={balance} />

      <section className="mt-8">
        <h2 className="text-lg font-bold text-navy-900">Pacotes avulsos</h2>
        <p className="mt-1 text-sm text-muted">Tokens comprados valem por 30 dias e só são consumidos depois da cota semanal.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <h3 className="text-base font-bold text-navy-900">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.tokens} reivindicações extras</p>
              <p className="mt-3 text-2xl font-extrabold text-navy-900">
                R$ {(p.price_cents / 100).toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-muted">
                ≈ R$ {(p.price_cents / 100 / p.tokens).toFixed(2).replace('.', ',')} por reivindicação
              </p>
              <div className="mt-4">
                <BuyTokenButton packageCode={p.code} />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-navy-900">Últimos movimentos</h2>
        <Card className="mt-3 overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-50 text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2">Quando</th>
                <th className="px-4 py-2">Operação</th>
                <th className="px-4 py-2 text-right">Tokens</th>
                <th className="px-4 py-2 text-right">Saldo semanal</th>
                <th className="px-4 py-2 text-right">Saldo extra</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    Ainda sem movimentos.
                  </td>
                </tr>
              ) : (
                ledger.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="px-4 py-2 text-muted">{formatDateTime(l.created_at)}</td>
                    <td className="px-4 py-2 text-navy-900">{TYPE_LABEL[l.type] ?? l.type}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${l.amount < 0 ? 'text-danger' : 'text-brand-green-dark'}`}>
                      {l.amount > 0 ? '+' : ''}
                      {l.amount}
                    </td>
                    <td className="px-4 py-2 text-right">{l.weekly_after}</td>
                    <td className="px-4 py-2 text-right">{l.extra_after}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="mt-10 rounded-xl border border-line bg-white p-5">
        <h2 className="text-base font-bold text-navy-900">Como o modelo funciona</h2>
        <ul className="mt-3 space-y-2 text-sm text-navy-900">
          <li>
            <strong>Vitrine aberta.</strong> Todos os consultores veem os leads disponíveis na aba <em>Novos leads</em>.
          </li>
          <li>
            <strong>Reivindicação com token.</strong> Para pegar um lead você gasta 1 token. Sem token, o botão fica
            desabilitado.
          </li>
          <li>
            <strong>Cota semanal.</strong> Cada plano concede X tokens por semana, calibrados pelo pool de tráfego pago
            (parte da sua mensalidade). Tokens não usados expiram toda segunda-feira.
          </li>
          <li>
            <strong>Pacotes avulsos.</strong> Precisa de mais? Compre um pacote. Tokens avulsos valem 30 dias e só são
            gastos depois da cota semanal.
          </li>
          <li>
            <strong>Reembolso.</strong> Lead contestado e aceito devolve 1 token como "extra".
          </li>
        </ul>
      </section>
    </>
  );
}
