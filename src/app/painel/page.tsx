import Link from 'next/link';
import { markNotificationsReadAction } from './actions';
import { Alert, Badge, ButtonLink, Card, PageTitle, Stat, formatDateTime } from '@/components/ui';
import { TokenBalanceCard } from '@/components/panel/token-balance-card';
import { EnablePushButton } from '@/components/panel/enable-push';
import { requireConsultant } from '@/lib/auth/guards';
import { SUBSCRIPTION_STATUS, VERIFICATION_STATUS } from '@/lib/labels';

interface Usage {
  active: boolean;
  status?: string;
  plan_name?: string;
  claim_limit?: number | string;
  claims_used?: number;
  remaining?: number | string;
  unlimited?: boolean;
  period_end?: string;
  grace_until?: string | null;
  cancel_at_period_end?: boolean;
}

export default async function PainelHome({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const { senha } = await searchParams;
  const { supabase, profile } = await requireConsultant();
  const [usageRes, available, assignments, notifications, tokenRes] = await Promise.all([
    supabase.rpc('consultant_usage'),
    supabase.rpc('list_available_leads', { p_limit: 100 }),
    supabase.from('lead_assignments').select('status, claimed_at, subscription_id'),
    supabase.from('notifications').select('id, title, body, type, created_at, read_at, lead_id').order('visible_at', { ascending: false }).limit(8),
    supabase.rpc('token_balance'),
  ]);
  const usage = (usageRes.data ?? { active: false }) as Usage;
  const tokens = (tokenRes.data ?? { weekly_balance: 0, weekly_quota: 0, extra_balance: 0 }) as {
    weekly_balance: number;
    weekly_quota: number;
    extra_balance: number;
    next_reset_at: string;
  };
  const rows = (assignments.data ?? []) as Array<{ status: string; claimed_at: string }>;
  const contacted = rows.filter((r) => ['contacted', 'converted', 'lost'].includes(r.status)).length;
  const converted = rows.filter((r) => r.status === 'converted').length;
  const awaiting = rows.filter((r) => r.status === 'active').length;

  return (
    <>
      <PageTitle title={`Olá, ${profile?.full_name.split(' ')[0] ?? 'consultor'}`} description="Resumo do seu ciclo e das oportunidades compatíveis." />
      {senha === 'atualizada' && <Alert tone="green" className="mb-4">Senha atualizada com sucesso.</Alert>}
      {profile?.verification_status !== 'verified' && (
        <Alert tone="neutral" className="mb-4" title={`Perfil: ${VERIFICATION_STATUS[profile?.verification_status ?? 'pending']}`}>
          Oportunidades com preferência por administradora exigem habilitação verificada. Declare suas administradoras em <Link className="underline" href="/painel/perfil">Perfil e segurança</Link>.
        </Alert>
      )}
      {!usage.active && (
        <Alert tone="warn" className="mb-4" title={usage.status ? SUBSCRIPTION_STATUS[usage.status] ?? 'Sem assinatura ativa' : 'Sem assinatura ativa'}>
          Para acessar e reivindicar oportunidades, ative um plano. <Link className="font-semibold underline" href="/painel/assinatura">Ir para Plano e assinatura</Link>
        </Alert>
      )}
      {usage.status === 'past_due' && (
        <Alert tone="warn" className="mb-4" title="Pagamento não confirmado">
          Seu acesso continua até {formatDateTime(usage.grace_until)}. Atualize o pagamento no Mercado Pago.
        </Alert>
      )}

      {usage.active && (
        <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <TokenBalanceCard balance={tokens} />
          <EnablePushButton vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Leads disponíveis para seu perfil" value={usage.active ? (available.data?.length ?? 0) : '—'} hint="Já considerando a janela do seu plano" />
        <Stat label="Reivindicados no ciclo" value={usage.active ? (usage.unlimited ? `${usage.claims_used ?? 0}` : `${usage.claims_used ?? 0}/${usage.claim_limit ?? 0}`) : '—'} hint={usage.period_end ? `Ciclo até ${formatDateTime(usage.period_end)}` : undefined} />
        <Stat label="Saldo de reivindicações" value={usage.active ? (usage.unlimited ? 'Sem limite' : usage.remaining ?? 0) : '—'} />
        <Stat label="Aguardando seu contato" value={awaiting} hint="Registre o contato em até 24 h" />
        <Stat label="Leads contatados" value={contacted} hint="Conforme status que você atualizou" />
        <Stat label="Resultados informados (vendas)" value={converted} />
        <Card className="p-5 sm:col-span-2">
          <p className="text-sm text-muted">Assinatura</p>
          <p className="mt-1 font-display text-xl font-bold text-navy-900">{usage.plan_name ?? 'Nenhum plano'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {usage.status && <Badge tone={usage.active ? 'green' : 'warn'}>{SUBSCRIPTION_STATUS[usage.status] ?? usage.status}</Badge>}
            {usage.cancel_at_period_end && <Badge tone="warn">Não renova</Badge>}
            <Link href="/painel/assinatura" className="text-sm text-navy-700 underline">Gerenciar</Link>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Oportunidades agora</h2>
            <ButtonLink href="/painel/novos-leads" size="sm">Ver todas</ButtonLink>
          </div>
          {!usage.active ? (
            <p className="mt-3 text-sm text-muted">Disponível com assinatura ativa.</p>
          ) : (available.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhuma oportunidade compatível no momento. Você será avisado quando surgir uma.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {(available.data ?? []).slice(0, 5).map((l: { lead_id: string; modality_name: string; city: string; state: string; published_at: string }) => (
                <li key={l.lead_id} className="flex items-center justify-between py-2.5 text-sm">
                  <span><strong>{l.modality_name}</strong> · {l.city}/{l.state}</span>
                  <span className="text-muted">{formatDateTime(l.published_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Notificações recentes</h2>
            <form action={markNotificationsReadAction}><button className="text-xs text-navy-700 underline">Marcar como lidas</button></form>
          </div>
          <ul className="mt-3 space-y-3">
            {(notifications.data ?? []).length === 0 && <li className="text-sm text-muted">Sem notificações.</li>}
            {(notifications.data ?? []).map((n: { id: string; title: string; body: string; created_at: string; read_at: string | null }) => (
              <li key={n.id} className={`rounded-lg p-3 text-sm ${n.read_at ? 'bg-white' : 'bg-navy-50'}`}>
                <p className="font-semibold text-navy-900">{n.title}</p>
                <p className="text-muted">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{formatDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
