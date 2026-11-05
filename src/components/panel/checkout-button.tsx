'use client';

import { useState } from 'react';

/** Inicia o checkout no servidor e redireciona ao Mercado Pago. */
export function CheckoutButton({ planCode, label }: { planCode: string; label: string }) {
  const [state, setState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  async function go() {
    setState({ loading: true });
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ planCode }) });
      const body = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (res.ok && body.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      setState({ loading: false, error: body.error ?? 'Não foi possível iniciar o pagamento.' });
    } catch {
      setState({ loading: false, error: 'Falha de conexão.' });
    }
  }
  return (
    <div>
      <button onClick={go} disabled={state.loading} className="w-full rounded-lg bg-brand-green px-4 py-2.5 font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60">
        {state.loading ? 'Abrindo Mercado Pago…' : label}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
    </div>
  );
}
