import Link from 'next/link';
import { SignUpForm } from '@/components/auth-forms';
import { formatBRL } from '@/lib/domain/money';
import { getPlans } from '@/lib/server/queries';

export const metadata = { title: 'Criar conta de consultor' };

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const [{ plano }, plans] = await Promise.all([searchParams, getPlans()]);
  const plan = plans.find((p) => p.code === plano);
  return (
    <>
      <h1 className="text-2xl font-bold">Criar conta de consultor</h1>
      {plan ? (
        <p className="mt-2 rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-900">
          Plano escolhido: <strong>{plan.name}</strong> — {formatBRL(plan.priceCents, { cents: false })}/mês, {plan.claimsUnlimited ? 'pedidos sem limite (volume conforme a demanda)' : `até ${plan.claimLimit} pedidos por ciclo`}.{' '}
          <Link href="/planos" className="underline">Trocar</Link>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Você poderá escolher o plano depois. <Link href="/planos" className="underline">Ver planos</Link>
        </p>
      )}
      <ol className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <li className="font-semibold text-navy-900">1. Conta</li><li>2. E-mail</li><li>3. Perfil</li><li>4. Termos</li><li>5. Pagamento</li>
      </ol>
      <div className="mt-6"><SignUpForm plan={plan?.code} /></div>
    </>
  );
}
