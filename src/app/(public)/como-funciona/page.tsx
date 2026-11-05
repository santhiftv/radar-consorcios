import type { Metadata } from 'next';
import { ButtonLink, Card } from '@/components/ui';
import { MAX_CONSULTANTS_PER_LEAD } from '@/content/legal';

export const metadata: Metadata = {
  title: 'Como funciona',
  description: 'Veja como funcionam o simulador, o pedido de propostas, o compartilhamento de dados e a distribuição para consultores.',
  alternates: { canonical: '/como-funciona' },
};

export default function ComoFuncionaPage() {
  return (
    <div className="container-page max-w-4xl py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Como funciona</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src='https://images.unsplash.com/photo-1533229613598-751dc97ec35f?auto=format&fit=crop&w=1600&h=600&q=70'
        alt="Casal sorrindo enquanto planeja no notebook"
        width={1600}
        height={600}
        loading="eager"
        decoding="async"
        className="mt-6 aspect-[8/3] w-full rounded-3xl object-cover object-[50%_35%]"
      />
      <div className="text-muted"><p className="mt-1.5 text-right text-[11px] opacity-70">Foto: <a href="https://unsplash.com/@brucemars?utm_source=consorcio_intel&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">bruce mars</a> / <a href="https://unsplash.com/?utm_source=consorcio_intel&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a></p></div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-bold">Para quem procura consórcio</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px] text-navy-900">
            <li><strong>Simule</strong> com cenários genéricos e entenda a ordem de grandeza das parcelas.</li>
            <li><strong>Peça propostas</strong> informando cidade, modalidade e faixas de valor.</li>
            <li><strong>Autorize</strong> (ou não) o compartilhamento. Comunicações promocionais têm autorização separada.</li>
            <li><strong>Receba contato</strong> de um consultor compatível. No máximo {MAX_CONSULTANTS_PER_LEAD}, um de cada vez.</li>
            <li><strong>Revogue</strong> quando quiser em Privacidade e meus dados.</li>
          </ol>
          <ButtonLink href="/simulador" className="mt-6">Começar pela simulação</ButtonLink>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">Para consultores</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px] text-navy-900">
            <li>Assine um plano e configure regiões, modalidades e filtros.</li>
            <li>Receba avisos de oportunidades compatíveis no painel e por e-mail — sem dados de contato.</li>
            <li>Reivindique: o servidor atribui a oportunidade a um único consultor, de forma atômica.</li>
            <li>Acesse o contato no painel e registre o atendimento em até 24 h.</li>
            <li>Conteste leads inválidos em até 7 dias para recuperar a reivindicação.</li>
          </ol>
          <ButtonLink href="/planos" variant="navy" className="mt-6">Ver planos</ButtonLink>
        </Card>
      </div>
    </div>
  );
}
