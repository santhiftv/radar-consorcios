import type { Metadata } from 'next';
import { Disclaimers } from '@/components/content-blocks';
import { SimulatorWidget } from '@/components/simulator-widget';
import { getAdministrators, getModalities } from '@/lib/server/queries';

export const metadata: Metadata = {
  title: 'Simulador de consórcio (ilustrativo)',
  description: 'Simule parcelas de consórcio de veículos, imóveis e serviços com cenários genéricos e transparentes. Não é proposta.',
  alternates: { canonical: '/simulador' },
};

export default async function SimuladorPage({ searchParams }: { searchParams: Promise<{ modalidade?: string }> }) {
  const [{ modalidade }, modalities, administrators] = await Promise.all([searchParams, getModalities(), getAdministrators()]);
  return (
    <div className="container-page py-12">
      <nav aria-label="Trilha" className="text-sm text-muted">
        <a href="/" className="hover:underline">Início</a> / <span aria-current="page">Simulador</span>
      </nav>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Simulador de consórcio</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Em dois passos rápidos: o valor da carta e seus dados. Você vê três cenários de parcela e um consultor da sua região pode apresentar condições reais.
      </p>
      <div className="mt-8">
        <SimulatorWidget
          modalities={modalities.length ? modalities : [{ id: 'imoveis', name: 'Imóveis' }]}
          initialModality={modalidade}
          leadForm={{ administrators, turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY }}
        />
      </div>
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold">Como calculamos</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Usamos a fórmula básica de referência: <strong>parcela ≈ crédito × (1 + taxa de administração total + fundo de reserva) ÷ prazo</strong>.
            Os percentuais de cada cenário são hipotéticos e editáveis. Não incluímos seguros, reajustes anuais do crédito, lances ou regras específicas de cada grupo.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold">O que muda na proposta real</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Cada administradora e cada grupo definem taxa de administração, fundo de reserva, seguros, índice de reajuste e regras de lance. Por isso a parcela real pode ser diferente da estimativa.
          </p>
        </div>
      </section>
      <div className="mt-10"><Disclaimers /></div>
    </div>
  );
}
