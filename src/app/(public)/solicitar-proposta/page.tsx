import type { Metadata } from 'next';
import { Disclaimers } from '@/components/content-blocks';
import { LeadForm } from '@/components/lead-form';
import { Card } from '@/components/ui';
import { getAdministrators, getModalities } from '@/lib/server/queries';

export const metadata: Metadata = {
  title: 'Solicitar propostas de consórcio',
  description: 'Peça gratuitamente propostas de consultores de consórcio compatíveis com sua cidade e modalidade. Você controla o compartilhamento dos seus dados.',
  alternates: { canonical: '/solicitar-proposta' },
};

type SP = Promise<Record<string, string | undefined>>;

export default async function SolicitarPropostaPage({ searchParams }: { searchParams: SP }) {
  const [sp, modalities, administrators] = await Promise.all([searchParams, getModalities(), getAdministrators()]);
  const defaults = {
    modality: sp.modalidade,
    creditBand: sp.credito,
    installmentBand: sp.parcela,
    termMonths: sp.prazo,
    city: sp.cidade,
    state: sp.uf,
  };
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Receba propostas de consultores</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          Conte o que você procura. Um consultor independente compatível com sua região poderá apresentar condições reais de administradoras com as quais trabalha.
        </p>
        <Card className="mt-8 p-5 sm:p-7">
          <LeadForm modalities={modalities} administrators={administrators} source="form" defaults={defaults} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        </Card>
      </div>
      <aside className="space-y-5 lg:pt-24">
        <Card className="p-5">
          <h2 className="text-lg font-bold">O que acontece depois</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-navy-900">
            <li>Seu pedido é registrado com a autorização que você escolheu.</li>
            <li>Consultores compatíveis veem apenas um resumo (sem seu contato).</li>
            <li>O primeiro que reivindicar recebe seus dados e tem até 24 h para contato.</li>
            <li>Se ele não fizer contato, no máximo mais um consultor pode receber o pedido.</li>
          </ol>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-bold">Você no controle</h2>
          <p className="mt-2 text-sm text-muted">
            Revogue o compartilhamento, pare de receber comunicações ou peça a exclusão dos seus dados quando quiser em <a className="font-semibold text-navy-700 underline" href="/privacidade/solicitacoes">Privacidade e meus dados</a>.
          </p>
        </Card>
        <Disclaimers />
      </aside>
    </div>
  );
}
