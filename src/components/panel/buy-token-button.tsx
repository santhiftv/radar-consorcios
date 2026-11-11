'use client';

import { useState, useTransition } from 'react';

export function BuyTokenButton({ packageCode }: { packageCode: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      try {
        const res = await fetch('/api/checkout/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageCode }),
          credentials: 'same-origin',
        });
        const data = (await res.json()) as { checkoutUrl?: string; error?: string };
        if (!res.ok || !data.checkoutUrl) {
          setError(data.error ?? 'Não foi possível iniciar a compra.');
          return;
        }
        window.location.href = data.checkoutUrl;
      } catch {
        setError('Erro de rede. Tente novamente.');
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
      >
        {pending ? 'Abrindo…' : 'Comprar com Mercado Pago'}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
