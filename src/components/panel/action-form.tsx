'use client';

import { useActionState, type ReactNode } from 'react';
import type { ActionState } from '@/app/painel/actions';

/** Formulário genérico para Server Actions que retornam ActionState. */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = 'navy',
  className,
  resetOnSuccess = false,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel: string;
  submitVariant?: 'navy' | 'green' | 'danger' | 'secondary';
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const styles = {
    navy: 'bg-navy-900 text-white hover:bg-navy-800',
    green: 'bg-brand-green text-white hover:bg-brand-green-dark',
    danger: 'bg-danger text-white hover:opacity-90',
    secondary: 'border border-line bg-white text-navy-900 hover:bg-navy-50',
  }[submitVariant];
  return (
    <form action={formAction} className={className ?? 'space-y-4'} key={resetOnSuccess && state.ok ? 'done' : 'form'}>
      {children}
      {state.fields && Object.keys(state.fields).length > 0 && (
        <ul className="list-disc rounded-lg bg-danger-soft py-2 pl-8 pr-3 text-sm text-danger">
          {Object.entries(state.fields).map(([k, v]) => <li key={k}>{v}</li>)}
        </ul>
      )}
      {state.error && !state.fields && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.message && <p role="status" className="rounded-lg bg-brand-green-soft px-3 py-2 text-sm text-navy-900">{state.message}</p>}
      <button disabled={pending} className={`rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${styles}`}>
        {pending ? 'Salvando…' : submitLabel}
      </button>
    </form>
  );
}
