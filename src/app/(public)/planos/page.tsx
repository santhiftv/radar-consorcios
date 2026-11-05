import type { Metadata } from 'next';
import { consultantFaq } from '@/content/faq';
import { FaqList, PlanPolicies, PlansGrid } from '@/components/content-blocks';
import { SectionHeading } from '@/components/ui';
import { getPlans } from '@/lib/server/queries';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Planos para consultores de consórcio',
  description: 'Receba oportunidades autorizadas de pessoas interessadas em consórcio na sua região. Planos mensais com limite de reivindicações e regras transparentes.',
  alternates: { canonical: '/planos' },
};

const STEPS = ['Escolha o plano', 'Crie sua conta', 'Confirme o e-mail', 'Complete o perfil profissional', 'Aceite os termos', 'Pague com Mercado Pago', 'Acesso liberado após confirmação'];

export default async function PlanosPage() {
  const plans = await getPlans();
  return (
    <div className="container-page py-12">
      <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <SectionHeading eyebrow="Sou consultor" title="Oportunidades autorizadas para consultores de consórcio" description="Pessoas que pediram propostas e autorizaram o compartilhamento. Você reivindica as que combinam com sua região, modalidades e filtros." />
        <figure className="hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src='https://images.unsplash.com/photo-1714974528757-f63c72154a1b?auto=format&fit=crop&w=1000&h=650&q=70'
          alt="Consultor conversando com clientes em uma mesa de atendimento"
          width={1000}
          height={650}
          loading="eager"
          decoding="async"
          className="aspect-[20/13] w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
        />
        <figcaption className="text-muted"><p className="mt-1.5 text-right text-[11px] opacity-70">Foto: <a href="https://unsplash.com/@silverkblack?utm_source=radar_consorcios&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">Vitaly Gariev</a> / <a href="https://unsplash.com/?utm_source=radar_consorcios&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a></p></figcaption>
        </figure>
      </div>
      <ol className="mt-8 flex flex-wrap gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1.5 text-navy-900">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-10"><PlansGrid plans={plans} /></div>
      <p className="mt-4 text-sm text-muted">Preços e limites são condições comerciais iniciais e podem mudar; alterações valem a partir da renovação seguinte, com aviso prévio.</p>
      <div className="mt-10"><PlanPolicies plans={plans} /></div>
      <section className="mt-14">
        <h2 className="text-2xl font-bold">Dúvidas de consultores</h2>
        <div className="mt-5"><FaqList items={consultantFaq} /></div>
      </section>
      <section className="mt-14 rounded-2xl border border-line bg-navy-50 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-navy-900">O que você acessa depois de assinar</h2>
        <p className="mt-2 text-navy-900">
          Assim que o pagamento é confirmado, seu usuário e senha liberam o painel do consultor. Cada consultor tem seu
          próprio acesso e vê apenas os leads a ele atribuídos.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          <li className="flex items-start gap-2 text-sm text-navy-900">
            <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
            <span><strong>Novos leads</strong> — oportunidades que combinam com sua região, modalidade e filtros.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-navy-900">
            <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
            <span><strong>Meus leads</strong> — contatos reivindicados, histórico de contatos e status.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-navy-900">
            <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
            <span><strong>Desempenho</strong> — reivindicações do mês, taxa de contato e resultados.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-navy-900">
            <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
            <span><strong>Assinatura</strong> — plano atual, cobrança via Mercado Pago, upgrade ou cancelamento.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-navy-900">
            <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
            <span><strong>Perfil e preferências</strong> — dados profissionais, administradoras, horários de contato.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-navy-900">
            <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
            <span><strong>Suporte</strong> — canal direto para tirar dúvidas e contestar leads.</span>
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/cadastro" className="rounded-lg bg-brand-green px-5 py-3 font-semibold text-white hover:bg-brand-green-dark">
            Criar minha conta
          </a>
          <a href="/entrar" className="rounded-lg border border-line px-5 py-3 font-semibold text-navy-900 hover:bg-white">
            Já tenho conta — entrar
          </a>
        </div>
      </section>
    </div>
  );
}
