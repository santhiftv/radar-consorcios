'use client';

import { useState, useTransition } from 'react';
import { exportSubjectDataAction } from '@/app/admin/actions';

/** Gera o relatório de acesso do titular (JSON) — a exportação é auditada. */
export function ExportSubjectButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await exportSubjectDataAction(requestId);
            if ('error' in r && r.error) return setError(r.error);
            const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `dados-titular-${requestId.slice(0, 8)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          })
        }
        className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold"
      >
        {pending ? 'Gerando…' : 'Exportar dados (JSON)'}
      </button>
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
    </span>
  );
}
