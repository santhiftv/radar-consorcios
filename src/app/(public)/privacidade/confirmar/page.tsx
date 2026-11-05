import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Alert, Card } from '@/components/ui';
import { confirmPrivacyRequest, PRIVACY_REQUEST_TYPES, type PrivacyRequestType } from '@/lib/services/privacy';
import { serviceRpc } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Confirmar solicitação', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  invalid_token: 'Link inválido ou já utilizado.',
  expired_token: 'O link expirou. Faça uma nova solicitação.',
  error: 'Não foi possível confirmar agora. Tente novamente em instantes.',
};

/**
 * A confirmação exige um clique no botão (POST via Server Action). Assim,
 * scanners de e-mail que "abrem" links não confirmam pedidos sozinhos.
 */
export default async function ConfirmarPage({ searchParams }: { searchParams: Promise<{ token?: string; r?: string; t?: string }> }) {
  const { token, r, t } = await searchParams;

  async function confirm(formData: FormData) {
    'use server';
    const tk = String(formData.get('token') ?? '');
    const result = await confirmPrivacyRequest(tk, { rpc: serviceRpc() });
    redirect(result.ok ? `/privacidade/confirmar?r=ok&t=${result.type}` : `/privacidade/confirmar?r=${result.reason}`);
  }

  return (
    <div className="container-page max-w-xl py-16">
      <h1 className="text-3xl font-extrabold">Confirmar solicitação</h1>
      {r === 'ok' ? (
        <Alert tone="green" title="Solicitação confirmada" className="mt-6">
          {t === 'withdraw_sharing' && 'O compartilhamento dos seus dados foi interrompido e os consultores foram avisados para cessar o contato.'}
          {t === 'opt_out_marketing' && 'Você não receberá mais comunicações promocionais.'}
          {t && !['withdraw_sharing', 'opt_out_marketing'].includes(t) &&
            `Recebemos sua solicitação de "${PRIVACY_REQUEST_TYPES[t as PrivacyRequestType] ?? 'privacidade'}". Responderemos em até 15 dias pelo e-mail informado.`}
        </Alert>
      ) : r ? (
        <Alert tone="danger" title="Não foi possível confirmar" className="mt-6">{MESSAGES[r] ?? MESSAGES.error}</Alert>
      ) : token ? (
        <Card className="mt-6 p-6">
          <p className="text-navy-900">Clique no botão abaixo para confirmar que foi você quem fez esta solicitação.</p>
          <form action={confirm} className="mt-5">
            <input type="hidden" name="token" value={token} />
            <button className="rounded-lg bg-navy-900 px-5 py-3 font-semibold text-white hover:bg-navy-800">Confirmar solicitação</button>
          </form>
        </Card>
      ) : (
        <Alert tone="warn" className="mt-6">Link incompleto. Abra o link recebido por e-mail.</Alert>
      )}
    </div>
  );
}
