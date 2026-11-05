'use client';

import { useState, useTransition } from 'react';
import { revealLeadContactAction } from '@/app/admin/actions';

/** Exibe o contato do titular sob demanda; cada acesso é registrado na auditoria. */
export function RevealContact({ leadId }: { leadId: string }) {
  const [data, setData] = useState<{ full_name: string | null; email: string | null; phone_e164: string | null } | null | undefined>(undefined);
  const [pending, start] = useTransition();
  if (data === undefined) {
    return (
      <button onClick={() => start(async () => setData(await revealLeadContactAction(leadId)))} disabled={pending} className="text-xs text-navy-700 underline">
        {pending ? '…' : 'Ver contato (auditado)'}
      </button>
    );
  }
  if (!data) return <span className="text-xs text-muted">Indisponível</span>;
  return <span className="text-xs">{data.full_name ?? '[anonimizado]'} · {data.email ?? '—'} · {data.phone_e164 ?? '—'}</span>;
}
