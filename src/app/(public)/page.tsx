import Link from 'next/link';
import { consumerFaq } from '@/content/faq';
import { ArticleCardView, Disclaimers, FaqList, JsonLd, PlansGrid } from '@/components/content-blocks';
import { SimulatorWidget } from '@/components/simulator-widget';
import { ButtonLink, SectionHeading } from '@/components/ui';
import { getAdministrators, getModalities, getPlans, getRecentArticles } from '@/lib/server/queries';
import { faqJsonLd } from '@/lib/domain/seo';
import { siteConfig } from '@/config/site';

export const revalidate = 300;

const MODALITY_ICONS: Record<string, string> = { veiculos: '🚗', imoveis: '🏠', servicos: '🎓', outros: '📦' };

const EDUCATION = [
  { title: 'Entenda parcela, taxa de administração e fundo de reserva', href: '/blog?categoria=educacao' },
  { title: 'Consórcio ou financiamento: como comparar com calma', href: '/blog?categoria=comparativos' },
  { title: 'Quanto da renda comprometer com uma parcela', href: '/blog?categoria=planejamento' },
  { title: 'Perguntas para fazer antes de assinar o contrato', href: '/blog?categoria=guias' },
];

export default async function HomePage() {
  const [modalities, administrators, plans, articles] = await Promise.all([getModalities(), getAdministrators(), getPlans(), getRecentArticles(3)]);
  const mods = modalities.length ? modalities : [{ id: 'imoveis', name: 'Imóveis', description: null }];

  return (
    <>
      <JsonLd data={faqJsonLd(consumerFaq)} />
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,rgba(31,157,107,0.35),transparent_60%)]" />
        <div className="container-page relative grid gap-10 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">Planejamento com clareza</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl">
              Simule seu consórcio e receba propostas de consultores da sua região
            </h1>
            <p className="mt-5 max-w-xl text-lg text-navy-100">
              Compare cenários ilustrativos de parcela, aprenda com conteúdo educativo e, se quiser, peça para um consultor independente apresentar condições reais.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="#simulador" size="lg">Simular agora</ButtonLink>
              <ButtonLink href="/solicitar-proposta" size="lg" variant="secondary">Receber propostas</ButtonLink>
            </div>
            <p className="mt-6 max-w-xl text-sm text-navy-100/80">
              Sem promessas de contemplação. Seus dados só são compartilhados com sua autorização.
            </p>
          </div>
          <div className="self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='https://images.unsplash.com/photo-1709787627975-9cb37bbeca60?auto=format&fit=crop&w=1200&h=800&q=70'
              alt="Casal sorrindo sentado em frente à casa nova"
              width={1200}
              height={800}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="aspect-[3/2] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/10"
            />
            <p className="mt-1.5 text-right text-[11px] opacity-70">Foto: <a href="https://unsplash.com/@jkalen71?utm_source=consorcio_intel&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">Jennifer Kalenberg</a> / <a href="https://unsplash.com/?utm_source=consorcio_intel&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a></p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {mods.map((m) => (
                <Link key={m.id} href={`/simulador?modalidade=${m.id}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold transition hover:bg-white/10">
                  <span aria-hidden>{MODALITY_ICONS[m.id] ?? '•'}</span>
                  {m.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="simulador" className="container-page scroll-mt-20 py-16">
        <SectionHeading eyebrow="Simulador" title="Uma estimativa honesta, em segundos" description="Três cenários genéricos de custos para você entender a ordem de grandeza — sem taxas inventadas de nenhuma administradora." />
        <div className="mt-8">
          <SimulatorWidget modalities={mods} leadForm={{ administrators, turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY }} />
        </div>
      </section>

      <section className="bg-navy-50 py-16">
        <div className="container-page">
          <SectionHeading eyebrow="Como funciona" title="Do planejamento à conversa com um consultor" align="center" />
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ['Simule e aprenda', 'Use o simulador e os guias para entender parcelas, prazos, lances e custos do consórcio.'],
              ['Peça propostas, se quiser', 'Informe cidade, modalidade e faixas de valor. Você decide se autoriza o compartilhamento.'],
              ['Converse com um consultor', 'Um consultor compatível com sua região entra em contato — no máximo dois, um de cada vez.'],
            ].map(([t, d], i) => (
              <li key={t} className="card p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-900 font-display font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Blog" title="Artigos recentes" />
          <Link href="/blog" className="text-sm font-semibold text-navy-700 underline">Ver todos os artigos</Link>
        </div>
        {articles.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {articles.map((a) => <ArticleCardView key={a.id} a={a} />)}
          </div>
        ) : (
          <p className="mt-6 text-muted">Em breve, novos conteúdos.</p>
        )}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {EDUCATION.map((e) => (
            <Link key={e.title} href={e.href} className="flex items-center justify-between rounded-xl border border-line px-5 py-4 font-medium text-navy-900 hover:border-navy-700">
              {e.title}
              <span aria-hidden className="text-brand-green">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-brand-green-soft py-14">
        <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold">Quer conhecer condições reais?</h2>
            <p className="mt-2 max-w-xl text-navy-900">Peça propostas gratuitamente. As condições são definidas pela administradora e pelo grupo escolhido.</p>
          </div>
          <ButtonLink href="/solicitar-proposta" size="lg">Solicitar propostas</ButtonLink>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Para consultores" title="Oportunidades autorizadas, distribuídas com regras claras" description="Planos mensais com limite de reivindicações, filtros por região e modalidade e janela de prioridade transparente." />
          <ButtonLink href="/planos" variant="navy">Sou consultor</ButtonLink>
        </div>
        <div className="mt-8">
          <PlansGrid plans={plans} compact />
        </div>
        <p className="mt-4 text-sm text-muted">{siteConfig.disclaimers.subscription}</p>
      </section>

      <section className="container-page pb-4">
        <SectionHeading eyebrow="Dúvidas" title="Perguntas frequentes" />
        <div className="mt-6"><FaqList items={consumerFaq} /></div>
        <div className="mt-8"><Disclaimers /></div>
      </section>
    </>
  );
}
