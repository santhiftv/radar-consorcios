'use client';

import { useState, type ReactNode } from 'react';

/**
 * Formulário simples que envia JSON para uma rota de API e exibe a resposta
 * real do servidor (nunca presume sucesso).
 */
export function JsonForm({ action, children, submitLabel, successTitle }: { action: string; children: ReactNode; submitLabel: string; successTitle: string }) {
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'error'; message?: string }>({ kind: 'idle' });
  const [startedAt] = useState(() => Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), startedAt };
    setState({ kind: 'sending' });
    try {
      const res = await fetch(action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      setState(res.ok ? { kind: 'ok', message: body.message } : { kind: 'error', message: body.error ?? 'Não foi possível enviar.' });
    } catch {
      setState({ kind: 'error', message: 'Falha de conexão. Tente novamente.' });
    }
  }

  if (state.kind === 'ok') {
    return (
      <div role="status" className="rounded-xl border border-brand-green/30 bg-brand-green-soft p-5">
        <p className="font-bold text-navy-900">{successTitle}</p>
        {state.message && <p className="mt-1 text-sm text-navy-900">{state.message}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {children}
      {state.kind === 'error' && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={state.kind === 'sending'} className="rounded-lg bg-navy-900 px-5 py-2.5 font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
        {state.kind === 'sending' ? 'Enviando…' : submitLabel}
      </button>
    </form>
  );
}
