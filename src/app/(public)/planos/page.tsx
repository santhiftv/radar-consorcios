import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { consultantFaq } from '@/content/faq';
import {
  brl,
  COMBO_TIERS,
  CREATIVE_TIERS,
  PRO_COMBO_TIERS,
  PRO_PRICE,
  SINGLE_CREATIVE_PRICE,
  SINGLE_VIDEO_PRICE,
  VIDEO_TIERS,
  type CreativeTier,
} from '@/content/creative-plans';
import { FaqList, PlanPolicies, PlansGrid } from '@/components/content-blocks';
import { Reveal } from '@/components/reveal';
import { Badge, ButtonLink, Card, SectionHeading } from '@/components/ui';
import { getPlans } from '@/lib/server/queries';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Planos para consultores de consórcio',
  description:
    'Leads qualificados com contato autorizado, anúncios criados por nós e conteúdo para Instagram. Conheça os planos Básico, Profissional, Personalizado e o combo de criativos e vídeos.',
  alternates: { canonical: '/planos' },
};

/* ───────────── Fotos (Unsplash) ───────────── */

const PHOTOS = {
  hero: {
    src: 'https://images.unsplash.com/photo-1714974528757-f63c72154a1b?auto=format&fit=crop&w=1000&h=650&q=70',
    alt: 'Consultor conversando com clientes em uma mesa de atendimento',
    name: 'Vitaly Gariev',
    user: 'silverkblack',
  },
  process: {
    src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&h=700&q=70',
    alt: 'Profissional conduzindo uma reunião com notebook',
    name: 'Headway',
    user: 'headwayio',
  },
  creatives: {
    src: 'https://images.unsplash.com/photo-1676276375742-9e3d10e39d45?auto=format&fit=crop&w=1000&h=700&q=70',
    alt: 'Quadro com planejamento de conteúdo para redes sociais',
    name: 'Walls.io',
    user: 'walls_io',
  },
  video: {
    src: 'https://images.unsplash.com/photo-1758273239210-59fea02475eb?auto=format&fit=crop&w=1000&h=700&q=70',
    alt: 'Criadora de conteúdo gravando um vídeo curto',
    name: 'Vitaly Gariev',
    user: 'silverkblack',
  },
  custom: {
    src: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&h=700&q=70',
    alt: 'Mesa de trabalho com notebook e celular para gestão de campanhas',
    name: 'Andrew Neel',
    user: 'andrewtneel',
  },
} as const;

function Photo({ photo, className = '', eager = false }: { photo: (typeof PHOTOS)[keyof typeof PHOTOS]; className?: string; eager?: boolean }) {
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.alt}
        width={1000}
        height={650}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="aspect-[20/13] w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
      />
      <figcaption className="text-muted">
        <p className="mt-1.5 text-right text-[11px] opacity-70">
          Foto: <a href={`https://unsplash.com/@${photo.user}?utm_source=radar_consorcios&utm_medium=referral`} target="_blank" rel="noopener noreferrer" className="underline">{photo.name}</a> /{' '}
          <a href="https://unsplash.com/?utm_source=radar_consorcios&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>
        </p>
      </figcaption>
    </figure>
  );
}

/* ───────────── Blocos de layout ───────────── */

function Section({ id, children, tone = 'plain' }: { id?: string; children: ReactNode; tone?: 'plain' | 'soft' | 'green' }) {
  const bg = tone === 'soft' ? 'bg-navy-50' : tone === 'green' ? 'bg-brand-green-soft' : '';
  return (
    <section id={id} className={`scroll-mt-20 py-14 sm:py-16 ${bg}`}>
      <div className="container-page">{children}</div>
    </section>
  );
}

function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-navy-900">
      <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
      <span>{children}</span>
    </li>
  );
}

function TierTable({ title, tiers, unitLabel }: { title: string; tiers: CreativeTier[]; unitLabel: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <p className="bg-navy-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <table className="w-full text-sm">
        <tbody>
          {tiers.map((t) => (
            <tr key={t.perWeek} className="border-t border-line">
              <td className="px-4 py-3 text-navy-900">
                <strong>{t.perWeek}</strong> {unitLabel} por semana
                <span className="block text-xs text-muted">{t.perMonth} por mês</span>
              </td>
              <td className="px-4 py-3 text-right font-display text-lg font-extrabold text-navy-900">{brl(t.price)}<span className="text-xs font-medium text-muted">/mês</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── Dados da página ───────────── */

const PROCESS = [
  { n: '1', title: 'Você assina e paga', text: 'Escolha o plano, crie sua conta e pague pelo Mercado Pago. O acesso ao painel é liberado após a confirmação.' },
  { n: '2', title: 'Nós criamos os anúncios', text: 'Com o valor das assinaturas, nós criamos e gerenciamos os anúncios que atraem pessoas interessadas em consórcio. Você não precisa montar campanha.' },
  { n: '3', title: 'O lead chega autorizado', text: 'A pessoa preenche o formulário, autoriza o contato e informa o que procura. O lead entra na plataforma já com essas informações.' },
  { n: '4', title: 'Você atende e vende', text: 'Você reivindica os leads que combinam com sua região e modalidades, entra em contato e conduz a venda com muito mais contexto.' },
];

const PERSONALIZADO_EXAMPLES = [150000, 300000, 500000].map((budgetCents) => {
  const fee = budgetCents <= 300000 ? 80000 : 80000 + Math.round(budgetCents * 0.1);
  return { budget: budgetCents / 100, fee: fee / 100, total: (budgetCents + fee) / 100 };
});

const AGENCY_ROWS = [
  {
    service: 'Gestão de anúncios no Instagram e Facebook',
    agency: 'R$ 700 a R$ 2.030 por mês para pequenas empresas; de R$ 1.500 a R$ 6.000 em contas maiores',
    radar: 'Plano Personalizado: taxa de R$ 800 (verba até R$ 3.000), com criativos, segmentação e relatórios incluídos',
  },
  {
    service: 'Pacote mensal de conteúdo para redes sociais',
    agency: 'R$ 1.500 a R$ 2.800 por mês para 12 a 16 publicações, com planejamento e interação',
    radar: `Combo 4 + 4 por semana: ${brl(COMBO_TIERS.at(-1)?.price ?? 0)} por mês, com 16 criativos e 16 vídeos`,
  },
  {
    service: 'Agência de geração de leads',
    agency: 'R$ 3.000 a R$ 7.000 por mês, fora a verba de anúncios',
    radar: `Plano Profissional: ${brl(PRO_PRICE)} por mês, com leads qualificados na plataforma`,
  },
];

/* ───────────── Página ───────────── */

export default async function PlanosPage() {
  const plans = await getPlans();
  return (
    <>
      {/* 1. Abertura */}
      <section className="container-page py-12 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Reveal from="left"><SectionHeading
              eyebrow="Sou consultor"
              title="Leads qualificados e conteúdo pronto para você vender mais consórcio"
              description="Nós criamos os anúncios, trazemos pessoas que pediram proposta e autorizaram o contato, e ainda produzimos os criativos e vídeos do seu Instagram."
            /></Reveal>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="#planos" size="lg">Ver planos</ButtonLink>
              <ButtonLink href="/cadastro" variant="secondary" size="lg">Criar minha conta</ButtonLink>
            </div>
            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Estimativa média</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold text-navy-900">20 a 30</dd>
                <dd className="text-xs text-muted">leads qualificados por mês, por consultor</dd>
              </Card>
              <Card className="p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Contato</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold text-navy-900">Autorizado</dd>
                <dd className="text-xs text-muted">a pessoa pediu a proposta</dd>
              </Card>
              <Card className="p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Informações</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold text-navy-900">Prévias</dd>
                <dd className="text-xs text-muted">antes mesmo da primeira conversa</dd>
              </Card>
            </dl>
          </div>
          <Reveal from="right"><Photo photo={PHOTOS.hero} eager className="mx-auto w-full max-w-xs" /></Reveal>
        </div>
      </section>

      {/* 2. Como funciona a assinatura */}
      <Section tone="soft" id="como-funciona">
        <Reveal from="right"><SectionHeading
          eyebrow="Como funciona"
          title="Sua assinatura vira anúncio, e o anúncio vira lead"
          description="Você não precisa investir em tráfego, contratar agência nem aprender a criar campanha. Nós cuidamos dessa parte."
        /></Reveal>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
          <ol className="grid gap-4 sm:grid-cols-2">
            {PROCESS.map((s) => (
              <li key={s.n}>
                <Card className="h-full p-5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">{s.n}</span>
                  <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.text}</p>
                </Card>
              </li>
            ))}
          </ol>
          <Photo photo={PHOTOS.process} />
        </div>
      </Section>

      {/* 3. O lead */}
      <Section id="o-lead">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Reveal from="left"><SectionHeading
              eyebrow="O que você recebe"
              title="Um lead que já chegou pronto para conversar"
              description="Cada pedido é criado com a autorização da pessoa para ser contatada e com informações sobre o que ela procura. Isso encurta a conversa e deixa a venda mais fácil."
            /></Reveal>
            <ul className="mt-6 space-y-3">
              <Check><strong>Contato autorizado.</strong> A pessoa preencheu o formulário e pediu a proposta.</Check>
              <Check><strong>Informações prévias.</strong> Modalidade, valor da carta, parcela desejada, urgência e região, tudo antes do primeiro contato.</Check>
              <Check><strong>Menos tempo explicando.</strong> Você começa a conversa já sabendo o que a pessoa quer.</Check>
              <Check><strong>Filtros do seu jeito.</strong> Você escolhe regiões, modalidades e administradoras que combinam com sua carteira.</Check>
            </ul>
          </div>
          <Card className="p-6" aria-label="Exemplo ilustrativo de lead">
            <div className="flex items-center justify-between">
              <p className="font-bold text-navy-900">Novo lead</p>
              <Badge tone="green">Autorizou contato</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ['Modalidade', 'Imóvel'],
                ['Valor da carta', 'R$ 250 mil'],
                ['Parcela desejada', 'Até R$ 1.800'],
                ['Urgência', '8 de 10'],
                ['Região', 'Curitiba, PR'],
                ['Origem', 'Formulário do site'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-navy-50 p-3">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-lg bg-navy-900 px-4 py-3 text-center text-sm font-semibold text-white">Reivindicar lead</div>
            <p className="mt-3 text-xs text-muted">Exemplo ilustrativo. Os dados de contato aparecem para você depois de reivindicar o lead.</p>
          </Card>
        </div>
      </Section>

      {/* 4. Painel */}
      <Section tone="soft" id="painel">
        <Reveal from="right"><SectionHeading
          eyebrow="Seu painel"
          title="Tudo organizado em um só lugar"
          description="Depois do pagamento, seu usuário e senha liberam o painel do consultor. Cada consultor vê apenas os leads atribuídos a ele."
        /></Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Novos leads</p>
            <ul className="mt-3 space-y-2 text-sm">
              {['Imóvel · Curitiba · urgência 8', 'Carro · São José dos Pinhais · urgência 6', 'Moto · Colombo · urgência 7'].map((l) => (
                <li key={l} className="rounded-lg border border-line bg-white px-3 py-2 text-navy-900">{l}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">Veja as oportunidades abertas e reivindique as que combinam com você.</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Meus leads</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[['Em contato', 'green'], ['Proposta enviada', 'neutral'], ['Fechado', 'navy']].map(([s, tone]) => (
                <li key={s} className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2">
                  <span className="text-navy-900">Lead de exemplo</span>
                  <Badge tone={tone as 'green' | 'neutral' | 'navy'}>{s}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">Acompanhe o histórico de contatos e o status de cada atendimento.</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Desempenho</p>
            <div className="mt-3 space-y-3">
              {[['Reivindicações do mês', 72], ['Taxa de contato', 58], ['Propostas enviadas', 40]].map(([label, pct]) => (
                <div key={label as string}>
                  <p className="text-sm text-navy-900">{label}</p>
                  <div className="mt-1 h-2 rounded-full bg-navy-100"><div className="h-2 rounded-full bg-navy-800" style={{ width: `${pct}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">Acompanhe seus números e ajuste sua rotina. Gráfico ilustrativo.</p>
          </Card>
        </div>
      </Section>

      {/* 5. Planos de leads */}
      <Section id="planos">
        <Reveal from="left"><SectionHeading
          eyebrow="Planos de leads"
          title="Escolha como você quer receber seus leads"
          description="Dois planos mensais com acesso à vitrine de leads e um plano sob medida, com anúncio só seu."
        /></Reveal>
        <div className="mt-8"><PlansGrid plans={plans} /></div>
        <Card className="mt-8 grid items-center gap-6 p-6 md:grid-cols-[auto_1fr]">
          <div className="rounded-2xl bg-brand-green-soft px-6 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-green-dark">Média estimada</p>
            <p className="font-display text-4xl font-extrabold text-navy-900">20 a 30</p>
            <p className="text-sm text-navy-900">leads qualificados por mês</p>
          </div>
          <p className="text-sm text-muted">
            Esta é uma estimativa média de oportunidades disponíveis na plataforma para cada consultor ativo. O volume real muda com a região, as modalidades que você atende e o investimento em anúncios, e não é garantido. Quanto você reivindica depende da cota semanal do seu plano.
          </p>
        </Card>
        <div className="mt-8 rounded-2xl border border-brand-green/20 bg-brand-green-soft p-6 sm:p-8">
          <h3 className="text-xl font-bold text-navy-900">Como a distribuição funciona</h3>
          <p className="mt-2 max-w-3xl text-navy-900">
            Todos os consultores veem a vitrine de leads em aberto. Para reivindicar, você gasta 1 <strong>token</strong>.
            Cada plano concede uma cota semanal; se precisar de mais, compra pacotes avulsos.
          </p>
          <ul className="mt-5 grid gap-2 md:grid-cols-2">
            <Check><strong>Cota semanal.</strong> Básico com 2 tokens e Profissional com 5 tokens por semana. Reset toda segunda-feira às 00:00, sem acúmulo.</Check>
            <Check><strong>Pacotes avulsos.</strong> 3 tokens por R$ 49, 7 por R$ 99 ou 15 por R$ 199, válidos por 30 dias.</Check>
            <Check><strong>Prioridade.</strong> O Profissional tem mais filtros e recebe os leads sem espera. O Básico tem prioridade menor.</Check>
            <Check><strong>Lead contestado.</strong> Se a contestação for aceita, você recebe 1 token de volta.</Check>
          </ul>
        </div>
      </Section>

      {/* 6. Personalizado */}
      <Section tone="soft" id="personalizado">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <Photo photo={PHOTOS.custom} />
          <Reveal from="right">
            <Badge tone="green">Plano Personalizado</Badge>
            <h2 className="mt-3 text-3xl font-bold sm:text-[2.1rem] sm:leading-tight">Um anúncio feito só para você</h2>
            <p className="mt-3 text-lg text-muted">
              Você define quanto quer investir. Nós cobramos uma taxa de administração, criamos uma campanha focada no seu perfil e os leads dela vão direto para você.
            </p>
            <ul className="mt-5 space-y-3">
              <Check><strong>Campanha dedicada.</strong> O anúncio é criado para o seu perfil, sua região e suas modalidades.</Check>
              <Check><strong>Sem interferência.</strong> Os leads não passam pela vitrine do site nem são disputados por outros consultores.</Check>
              <Check><strong>Funciona como uma agência.</strong> Criativos, segmentação e relatórios mensais incluídos.</Check>
            </ul>
          </Reveal>
        </div>
        <div className="mt-10">
          <h3 className="text-lg font-bold text-navy-900">Quanto custa</h3>
          <p className="mt-1 text-sm text-muted">Taxa de R$ 800 para verba de até R$ 3.000. Acima disso, R$ 800 mais 10% da verba total. A verba de anúncios é paga à parte, e a taxa é cobrada sobre ela.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {PERSONALIZADO_EXAMPLES.map((e) => (
              <Card key={e.budget} className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Exemplo</p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">Verba de anúncios</dt><dd className="font-semibold text-navy-900">{brl(e.budget)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Taxa de administração</dt><dd className="font-semibold text-navy-900">{brl(e.fee)}</dd></div>
                  <div className="flex justify-between border-t border-line pt-2"><dt className="font-semibold text-navy-900">Total no mês</dt><dd className="font-display text-lg font-extrabold text-navy-900">{brl(e.total)}</dd></div>
                </dl>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* 7. Criativos e vídeos */}
      <Section id="criativos-e-videos">
        <Reveal from="right"><SectionHeading
          eyebrow="Criativos e vídeos"
          title="Conteúdo para o seu Instagram, no mesmo padrão do Radar Consórcios"
          description="Além dos leads, você pode contratar criativos e vídeos para manter seu perfil ativo e passar mais confiança para quem pesquisa consórcio."
        /></Reveal>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <Photo photo={PHOTOS.creatives} />
            <h3 className="mt-5 text-xl font-bold">Criativos</h3>
            <p className="mt-1 text-sm text-muted">Carrosséis e posts com identidade visual, textos e chamada para ação, prontos para publicar.</p>
            <div className="mt-4"><TierTable title="Planos mensais" tiers={CREATIVE_TIERS} unitLabel="criativo(s)" /></div>
            <p className="mt-3 text-sm text-navy-900">Avulso: <strong>{brl(SINGLE_CREATIVE_PRICE)}</strong> por criativo.</p>
          </Card>
          <Card className="p-5 sm:p-6">
            <Photo photo={PHOTOS.video} />
            <h3 className="mt-5 text-xl font-bold">Vídeos</h3>
            <p className="mt-1 text-sm text-muted">Reels com roteiro, narração, legendas e trilha, prontos para publicar.</p>
            <div className="mt-4"><TierTable title="Planos mensais" tiers={VIDEO_TIERS} unitLabel="vídeo(s)" /></div>
            <p className="mt-3 text-sm text-navy-900">Avulso: <strong>{brl(SINGLE_VIDEO_PRICE)}</strong> por vídeo.</p>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <Badge tone="green">Combo</Badge>
            <h3 className="mt-3 text-xl font-bold">Vídeos e criativos juntos</h3>
            <p className="mt-1 text-sm text-muted">A mesma quantidade de vídeos e de criativos por semana, com preço menor do que contratar separado.</p>
            <div className="mt-4"><TierTable title="Combo mensal" tiers={COMBO_TIERS} unitLabel="vídeo + 1 criativo" /></div>
          </Card>
          <Card className="border-navy-900 p-5 ring-2 ring-navy-900 sm:p-6">
            <Badge tone="navy">Mais completo</Badge>
            <h3 className="mt-3 text-xl font-bold">Profissional + combo</h3>
            <p className="mt-1 text-sm text-muted">
              Sua mensalidade do plano Profissional ({brl(PRO_PRICE)}) somada ao combo, com desconto. Você recebe leads e conteúdo na mesma assinatura.
            </p>
            <div className="mt-4"><TierTable title="Profissional + combo" tiers={PRO_COMBO_TIERS} unitLabel="vídeo + 1 criativo" /></div>
          </Card>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ButtonLink href="/contato" size="lg">Quero conversar sobre criativos e vídeos</ButtonLink>
          <p className="text-sm text-muted">Prazos, revisões e como funciona a aprovação você combina com a nossa equipe.</p>
        </div>
      </Section>

      {/* 8. Comparação com agências */}
      <Section tone="soft" id="comparativo">
        <Reveal from="left"><SectionHeading
          eyebrow="Comparativo"
          title="O que o mercado cobra e o que cobramos"
          description="Valores de agências variam bastante. Veja faixas de referência publicadas em 2026 ao lado dos nossos planos."
        /></Reveal>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-navy-50 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3">Serviço</th>
                <th className="px-5 py-3">Referência de agências</th>
                <th className="px-5 py-3 text-brand-green-dark">Radar Consórcios</th>
              </tr>
            </thead>
            <tbody>
              {AGENCY_ROWS.map((r) => (
                <tr key={r.service} className="border-t border-line align-top">
                  <th scope="row" className="px-5 py-4 font-semibold text-navy-900">{r.service}</th>
                  <td className="px-5 py-4 text-muted">{r.agency}</td>
                  <td className="px-5 py-4 font-medium text-navy-900">{r.radar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-4xl text-xs text-muted">
          Faixas de referência de sites do setor, sujeitas a variação por escopo, região e experiência do profissional. Pacotes de agência costumam incluir serviços que não fazem parte dos nossos planos, como planejamento, publicação e gestão de comunidade. Fontes:{' '}
          <a className="underline" href="https://www.freelasemcrise.com.br/quanto-cobrar/gestao-trafego-pago-meta" target="_blank" rel="noopener noreferrer">FreelaSemCrise (gestão de tráfego)</a>,{' '}
          <a className="underline" href="https://jamilefernandes.com.br/blog/como-montar-um-pacote-de-social-media-que-vende" target="_blank" rel="noopener noreferrer">Comunidade SMAM (social media)</a> e{' '}
          <a className="underline" href="https://labra.com.br/?p=9355" target="_blank" rel="noopener noreferrer">Labra (agência de marketing digital)</a>.
        </p>
      </Section>

      {/* 9. Fechamento */}
      <Section>
        <p className="max-w-3xl text-sm text-muted">
          Preços e regras são condições comerciais iniciais e podem mudar; alterações valem a partir da renovação seguinte, com aviso prévio. O volume de leads é uma estimativa e não é garantido. Ao assinar, você concorda com os{' '}
          <Link href="/termos#consultor" className="underline">Termos do Consultor</Link>, incluindo a{' '}
          <Link href="/termos#reembolso" className="underline">política de cancelamento e reembolso</Link>.
        </p>
        <div className="mt-8"><PlanPolicies plans={plans} /></div>
        <div className="mt-14">
          <h2 className="text-2xl font-bold">Dúvidas de consultores</h2>
          <div className="mt-5"><FaqList items={consultantFaq} /></div>
        </div>
        <div className="mt-14 rounded-2xl bg-navy-900 p-8 text-center text-white sm:p-10">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Pronto para receber leads qualificados?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-navy-100">Crie sua conta, escolha o plano e comece a atender pessoas que já pediram proposta.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/cadastro" size="lg">Criar minha conta</ButtonLink>
            <ButtonLink href="/entrar" variant="secondary" size="lg">Já tenho conta, entrar</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
