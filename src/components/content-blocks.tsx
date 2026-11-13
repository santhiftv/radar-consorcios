import Link from 'next/link';
import { CATEGORY_LABELS, type ArticleCategory } from '@/lib/domain/editorial';
import { formatBRL } from '@/lib/domain/money';
import { describeClaimLimit, describePriorityPolicy } from '@/lib/domain/plans';
import type { ArticleCard, PublicPlan } from '@/lib/server/queries';
import { siteConfig } from '@/config/site';
import { Badge, ButtonLink, Card, formatDate } from './ui';

export function ArticleCardView({ a }: { a: ArticleCard }) {
  return (
    <Card className="group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/blog/${a.slug}`} className="flex flex-1 flex-col">
        {a.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.cover_image_url}
            alt={a.cover_image_alt ?? ''}
            width={800}
            height={450}
            loading="lazy"
            decoding="async"
            className="aspect-[16/9] w-full object-cover"
          />
        )}
        <div className="flex flex-1 flex-col p-5">
        <Badge tone="green">{CATEGORY_LABELS[a.category as ArticleCategory] ?? a.category}</Badge>
        <h3 className="mt-3 text-lg font-bold leading-snug group-hover:text-navy-700">{a.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted">{a.summary}</p>
        <p className="mt-auto pt-4 text-xs text-muted">
          <time dateTime={a.published_at}>{formatDate(a.published_at)}</time>
        </p>
        </div>
      </Link>
    </Card>
  );
}

export function FaqList({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((f) => (
        <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-navy-900">
            {f.q}
            <span aria-hidden className="text-brand-green transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

const FILTER_LABELS: Record<string, string> = {
  credit: 'crédito',
  installment: 'parcela',
  term: 'prazo',
  region: 'região',
  administrator: 'administradora',
};

export function PlansGrid({ plans, compact = false }: { plans: PublicPlan[]; compact?: boolean }) {
  if (plans.length === 0) {
    return <p className="text-sm text-muted">Planos indisponíveis no momento.</p>;
  }
  const highlight = plans.find((p) => p.code === 'profissional')?.code;
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((p) => {
        const isOpen = p.code === 'anuncios';
        return (
          <Card key={p.code} className={`relative flex flex-col p-6 ${p.code === highlight ? 'border-navy-900 ring-2 ring-navy-900' : ''}`}>
            {p.code === highlight && <Badge tone="navy" className="absolute -top-3 left-6">Mais escolhido</Badge>}
            <h3 className="text-xl font-bold">{p.name}</h3>
            {isOpen ? (
              <>
                <p className="mt-3">
                  <span className="font-display text-2xl font-extrabold text-navy-900">Verba + taxa</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-green-dark">Leads gerados pela sua verba vão direto para você</p>
                {!compact && (
                  <ul className="mt-5 space-y-2 text-sm text-navy-900">
                    <li className="flex gap-2"><span aria-hidden className="mt-0.5 text-brand-green">✓</span>Você define a verba mensal de anúncios (mínimo recomendado R$ 500)</li>
                    <li className="flex gap-2"><span aria-hidden className="mt-0.5 text-brand-green">✓</span>Taxa de administração: <strong>R$ 800</strong> para verba até R$ 3.000</li>
                    <li className="flex gap-2"><span aria-hidden className="mt-0.5 text-brand-green">✓</span>Verba acima de R$ 3.000: taxa R$ 800 + 10% do valor total</li>
                    <li className="flex gap-2"><span aria-hidden className="mt-0.5 text-brand-green">✓</span>Sem cota semanal e sem tokens: os leads chegam direto a você</li>
                    <li className="flex gap-2"><span aria-hidden className="mt-0.5 text-brand-green">✓</span>Criativos, segmentação e relatórios mensais incluídos</li>
                  </ul>
                )}
              </>
            ) : (
              <>
                <p className="mt-3">
                  <span className="font-display text-4xl font-extrabold text-navy-900">{formatBRL(p.priceCents, { cents: false })}</span>
                  <span className="text-muted">/mês</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-green-dark">{describeClaimLimit(p)}</p>
                {p.maxLeadUrgency >= 10 && <p className="mt-1 text-xs font-semibold text-navy-700">Exclusivo: leads com urgência 8 a 10</p>}
                {!compact && (
                  <ul className="mt-5 space-y-2 text-sm text-navy-900">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span aria-hidden className="mt-0.5 text-brand-green">✓</span>
                        {f}
                      </li>
                    ))}
                    <li className="flex gap-2 text-muted">
                      <span aria-hidden className="mt-0.5">•</span>
                      Filtros: {p.allowedFilters.map((f) => FILTER_LABELS[f] ?? f).join(', ')}
                    </li>
                  </ul>
                )}
              </>
            )}
            <div className="mt-auto pt-6">
              <ButtonLink
                href={isOpen ? '/contato?assunto=plano-em-aberto' : `/cadastro?plano=${p.code}`}
                variant={p.code === highlight ? 'navy' : 'secondary'}
                className="w-full"
              >
                {isOpen ? 'Falar com o time' : `Escolher ${p.name}`}
              </ButtonLink>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function PlanPolicies({ plans }: { plans: PublicPlan[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-lg font-bold">Política de distribuição (prioridade)</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-navy-900">
          {describePriorityPolicy(plans).map((l) => <li key={l}>{l}</li>)}
          <li>Dentro da janela, recebe a oportunidade quem concluir primeiro a reivindicação. A atribuição é feita pelo servidor; cliques simultâneos não geram duas atribuições.</li>
          <li>Urgência: quem pede proposta informa de 0 a 10 a urgência para contratar. Leads com urgência alta (8 a 10) vão primeiro para quem custeou os anúncios que os geraram; os demais ficam disponíveis para todos os planos compatíveis.</li>
          <li>Não há prioridade absoluta: a oportunidade precisa estar disponível e ser compatível com sua região, modalidade, filtros e habilitação.</li>
        </ul>
      </Card>
      <Card className="p-6">
        <h3 className="text-lg font-bold">Regras importantes</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-navy-900">
          <li>Renovação mensal automática; cancele quando quiser, com acesso até o fim do ciclo pago.</li>
          <li>Não há teto de reivindicações: o volume de pedidos é uma estimativa que depende da demanda real da sua região e modalidade. Não há garantia de quantidade de pedidos nem de vendas.</li>
          <li>Registre o contato em até 24 h após reivindicar; sem registro, o lead expira e pode ser redistribuído uma vez.</li>
          <li>Leads duplicados ou inválidos podem ser contestados em até 7 dias; contestações aceitas devolvem a reivindicação.</li>
          <li>{siteConfig.disclaimers.subscription}</li>
        </ul>
      </Card>
    </div>
  );
}

export function Disclaimers() {
  return (
    <div className="rounded-2xl border border-warn/30 bg-warn-soft p-5 text-sm leading-relaxed text-navy-900">
      <p className="font-semibold">Avisos importantes</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>{siteConfig.disclaimers.simulation}</li>
        <li>{siteConfig.disclaimers.contemplation}</li>
        <li>{siteConfig.disclaimers.independence}</li>
      </ul>
    </div>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
