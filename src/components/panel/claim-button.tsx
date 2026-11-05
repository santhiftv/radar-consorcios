'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { claimLeadAction } from '@/app/painel/actions';

export function ClaimButton({ leadId, disabled, disabledReason }: { leadId: string; disabled?: boolean; disabledReason?: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string; message?: string; assignmentId?: string } | null>(null);

  if (result?.ok) {
    return (
      <div className="text-right">
        <p className="text-sm font-semibold text-brand-green-dark">{result.message}</p>
        <Link href={`/painel/meus-leads/${leadId}`} className="mt-1 inline-block rounded-lg bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white">Ver contato</Link>
      </div>
    );
  }
  return (
    <div className="text-right">
      <button
        type="button"
        disabled={disabled || pending}
        title={disabled ? disabledReason : undefined}
        onClick={() => start(async () => setResult(await claimLeadAction(leadId)))}
        className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Reivindicando…' : 'Reivindicar'}
      </button>
      {result?.error && <p role="alert" className="mt-1 max-w-56 text-xs text-danger">{result.error}</p>}
      {disabled && disabledReason && !result && <p className="mt-1 max-w-56 text-xs text-muted">{disabledReason}</p>}
    </div>
  );
}
