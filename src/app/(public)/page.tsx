import Link from 'next/link';
import { consumerFaq } from '@/content/faq';
import { ArticleCardView, Disclaimers, FaqList, JsonLd } from '@/components/content-blocks';
import { LeadForm } from '@/components/lead-form';
import { ButtonLink, SectionHeading } from '@/components/ui';
import { getAdministrators, getModalities, getRecentArticles } from '@/lib/server/queries';
import { faqJsonLd } from '@/lib/domain/seo';
import { siteConfig } from '@/config/site';

export const revalidate = 300;

type RefModality = {
  id: string;
  icon: string;
  name: string;
  avgCredit: string;
  avgTerm: string;
  avgInstallment: string;
  rate: string;
  rateNote?: string;
  formHref: string;
};

const REFERENCE_MODALITIES: RefModality[] = [
  {
    id: 'imoveis',
    icon: '🏠',
    name: 'Imóvel',
    avgCredit: 'R$ 222,3 mil',
    avgTerm: '217 meses',
    avgInstallment: '≈ R$ 1.238/mês',
    rate: '20,84% ao total',
    formHref: '#receber-ofertas?modalidade=imoveis',
  },
  {
    id: 'veiculos-carro',
    icon: '🚗',
    name: 'Carro',
    avgCredit: 'R$ 71,2 mil',
    avgTerm: '90 meses',
    avgInstallment: '≈ R$ 910/mês',
    rate: '15,01% ao total',
    formHref: '#receber-ofertas?modalidade=veiculos',
  },
  {
    id: 'veiculos-moto',
    icon: '🏍️',
    name: 'Moto',
    avgCredit: 'R$ 19,3 mil',
    avgTerm: '66 meses',
    avgInstallment: '≈ R$ 355/mês',
    rate: '21,27% ao total',
    formHref: '#receber-ofertas?modalidade=veiculos',
  },
  {
    id: 'servicos',
    icon: '🎓',
    name: 'Serviços',
    avgCredit: 'R$ 15,6 mil',
    avgTerm: '39 meses',
    avgInstallment: '≈ R$ 473/mês',
    rate: '18,35% ao total (média do sistema)',
    rateNote: 'O Banco Central não publica a taxa específica de serviços; usamos a média geral do sistema.',
    formHref: '#receber-ofertas?modalidade=servicos',
  },
];

const HOW_IT_WORKS = [
  {
    title: 'Você diz o que quer',
    description: 'Modalidade, valor da carta, parcela que cabe no bolso e a urgência, de 0 a 10.',
  },
  {
    title: 'Consultores preparam as ofertas',
    description: 'Consultores da sua região buscam grupos novos, promoções e cartas em andamento ou contempladas.',
  },
  {
    title: 'Você compara e escolhe',
    description: 'Recebe as propostas pelo canal que preferir e segue só se fizer sentido. Sem compromisso.',
  },
];

const SOURCES = [
  {
    label: 'Panorama do Sistema de Consórcios 2024 — Banco Central',
    href: 'https://www.bcb.gov.br/estabilidadefinanceira/panoramaconsorcios',
  },
  {
    label: 'ABAC — 1º semestre 2026 (Estado de Minas)',
    href: 'https://www.em.com.br/',
  },
  {
    label: 'ABAC veículos até agosto/2026 — Autodata',
    href: 'https://www.autodata.com.br/',
  },
  {
    label: 'Carta contemplada — NaPista',
    href: 'https://www.napista.com.br/',
  },
];

export default async function HomePage() {
  const [modalities, administrators, articles] = await Promise.all([
    getModalities(),
    getAdministrators(),
    getRecentArticles(3),
  ]);
  const mods = modalities.length ? modalities : [{ id: 'imoveis', name: 'Imóveis', description: null }];
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <>
      <JsonLd data={faqJsonLd(consumerFaq)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,rgba(31,157,107,0.35),transparent_60%)]"
        />
        <div className="container-page relative grid gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">
              Radar Consórcios
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl">
              Encontre as melhores condições de consórcio para você.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-navy-100">
              Diga o que quer conquistar e receba ofertas de consultores selecionados: grupos novos, promoções e cartas
              contempladas ou em andamento. É grátis e sem compromisso.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="#receber-ofertas" size="lg">
                Quero receber ofertas
              </ButtonLink>
              <ButtonLink href="#como-funciona" size="lg" variant="secondary">
                Como funciona
              </ButtonLink>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-navy-100/90 sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <span aria-hidden className="text-brand-green">✓</span> Consultores avaliados
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="text-brand-green">✓</span> Várias administradoras
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="text-brand-green">✓</span> Seus dados só vão para quem você autorizar
              </li>
            </ul>
          </div>
          <div className="self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1709787627975-9cb37bbeca60?auto=format&fit=crop&w=1200&h=800&q=70"
              alt="Casal sorrindo em frente à casa nova"
              width={1200}
              height={800}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="aspect-[3/2] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/10"
            />
            <p className="mt-1.5 text-right text-[11px] opacity-70">
              Foto:{' '}
              <a
                href="https://unsplash.com/@jkalen71?utm_source=radar_consorcios&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Jennifer Kalenberg
              </a>{' '}
              /{' '}
              <a
                href="https://unsplash.com/?utm_source=radar_consorcios&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Unsplash
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Parcelas de referência do mercado */}
      <section id="parcelas" className="container-page scroll-mt-20 py-16">
        <SectionHeading
          eyebrow="Parcelas de referência do mercado"
          title="Uma ideia realista de parcela por modalidade"
          description="Médias dos grupos formados em 2024, segundo o Banco Central. Parcela ilustrativa, não é oferta."
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REFERENCE_MODALITIES.map((m) => (
            <div key={m.id} className="card flex flex-col p-6">
              <div className="flex items-center gap-3">
                <span aria-hidden className="text-2xl">
                  {m.icon}
                </span>
                <h3 className="text-lg font-bold text-navy-900">{m.name}</h3>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Carta média</dt>
                  <dd className="text-right font-semibold text-navy-900">{m.avgCredit}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Prazo médio</dt>
                  <dd className="text-right font-semibold text-navy-900">{m.avgTerm}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Taxa</dt>
                  <dd className="text-right font-semibold text-navy-900">{m.rate}</dd>
                </div>
              </dl>
              <p className="mt-4 text-2xl font-extrabold text-brand-green">{m.avgInstallment}</p>
              <p className="mt-1 text-xs text-muted">Parcela ilustrativa, não é oferta.</p>
              {m.rateNote && <p className="mt-2 text-xs text-muted italic">{m.rateNote}</p>}
              <ButtonLink href={m.formHref} size="sm" className="mt-5 w-full justify-center">
                Receber ofertas
              </ButtonLink>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">
          Fontes: Banco Central — Panorama do Sistema de Consórcios 2024 (médias de carta, prazo e taxa por segmento).
          Taxa de serviços usa a média do sistema, por não haver taxa específica publicada.
        </p>
      </section>

      {/* Cartas contempladas e em andamento */}
      <section className="bg-navy-50 py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Cartas contempladas e em andamento"
              title="Quer antecipar a conquista? Pode ser uma carta que já tem sorteio."
            />
            <p className="mt-4 text-navy-900">
              Quem compra uma carta já contemplada paga um ágio sobre o valor restante — e usa o crédito para comprar o
              bem direto. Também é possível assumir cartas em andamento, com parcelas já pagas.
            </p>
            <p className="mt-3 text-navy-900">
              Não exibimos cartas inventadas aqui. Os consultores do Radar apresentam as cartas reais disponíveis depois
              do contato, com valor, ágio, parcela e administradora na mesa.
            </p>
            <div className="mt-6">
              <ButtonLink href="#receber-ofertas" size="lg">
                Ver cartas disponíveis
              </ButtonLink>
            </div>
          </div>
          <ul className="grid gap-4">
            <li className="card p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Contemplada</p>
              <h3 className="mt-1 text-lg font-bold text-navy-900">Crédito liberado para usar</h3>
              <p className="mt-2 text-sm text-navy-900">
                Carta já com direito à compra do bem. Você paga o valor negociado com o vendedor (ágio) e assume as
                parcelas restantes. Costuma ser o caminho de quem tem pressa.
              </p>
            </li>
            <li className="card p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Em andamento</p>
              <h3 className="mt-1 text-lg font-bold text-navy-900">Grupo andando, parcelas pagas</h3>
              <p className="mt-2 text-sm text-navy-900">
                Você assume uma cota já em curso, aproveitando prazo e parcelas que já correram. A contemplação segue o
                regulamento do grupo (sorteio ou lance).
              </p>
            </li>
            <li className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Consórcio não garante contemplação em data específica. A contemplação ocorre por sorteio ou lance, conforme
              o regulamento de cada grupo.
            </li>
          </ul>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="container-page scroll-mt-20 py-16">
        <SectionHeading eyebrow="Como funciona" title="Em 3 passos" align="center" />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.title} className="card p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-900 font-display font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Formulário principal */}
      <section id="receber-ofertas" className="bg-brand-green-soft py-16 scroll-mt-20">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Receber ofertas"
              title="Diga o que quer conquistar"
              description="Preencha abaixo e consultores da sua região preparam as melhores condições para você — grupos novos, promoções e cartas em andamento ou contempladas."
            />
            <ul className="mt-6 space-y-3 text-sm text-navy-900">
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
                <span>Até 2 consultores entram em contato, um de cada vez — pelo canal que você escolher.</span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
                <span>Você pode interromper o compartilhamento quando quiser, em Privacidade e meus dados.</span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
                <span>Sem taxa para você. Os consultores pagam a assinatura do Radar.</span>
              </li>
            </ul>
          </div>
          <div className="card p-6 md:p-8">
            <LeadForm
              modalities={mods}
              administrators={administrators}
              source="home"
              turnstileSiteKey={turnstileSiteKey}
            />
          </div>
        </div>
      </section>

      {/* Blog curto */}
      <section className="container-page py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Blog" title="Para ler antes de assinar" />
          <Link href="/blog" className="text-sm font-semibold text-navy-700 underline">
            Ver todos os artigos
          </Link>
        </div>
        {articles.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {articles.map((a) => (
              <ArticleCardView key={a.id} a={a} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-muted">Em breve, novos conteúdos.</p>
        )}
      </section>

      {/* CTA final */}
      <section className="bg-navy-900 py-14 text-white">
        <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
              Pronto para comparar as melhores ofertas?
            </h2>
            <p className="mt-2 max-w-xl text-navy-100">
              Um minuto para preencher e consultores selecionados montam propostas sob medida para você.
            </p>
          </div>
          <ButtonLink href="#receber-ofertas" size="lg">
            Quero receber ofertas
          </ButtonLink>
        </div>
      </section>

      {/* Dúvidas */}
      <section className="container-page py-16">
        <SectionHeading eyebrow="Dúvidas" title="Perguntas frequentes" />
        <div className="mt-6">
          <FaqList items={consumerFaq} />
        </div>
        <div className="mt-10">
          <Disclaimers />
        </div>
      </section>

      {/* Fontes */}
      <section className="border-t border-line bg-white py-10">
        <div className="container-page">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Fontes dos dados</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-navy-700">
            {SOURCES.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-navy-900">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            {siteConfig.name} é uma plataforma independente, não é administradora de consórcio.
          </p>
        </div>
      </section>
    </>
  );
}
