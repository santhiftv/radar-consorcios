'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthState,
} from '@/app/(auth)/actions';

function Feedback({ state }: { state: AuthState }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-lg bg-brand-green-soft px-3 py-2 text-sm text-navy-900">{state.message}</p>;
  return null;
}

const submit = 'w-full rounded-lg bg-navy-900 px-4 py-3 font-semibold text-white hover:bg-navy-800 disabled:opacity-60';

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? '/painel'} />
      <div>
        <label htmlFor="email" className="field-label">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field-input" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Senha</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field-input" />
      </div>
      <Feedback state={state} />
      <button disabled={pending} className={submit}>{pending ? 'Entrando…' : 'Entrar'}</button>
      <div className="flex justify-between text-sm">
        <Link href="/recuperar-senha" className="text-navy-700 underline">Esqueci a senha</Link>
        <Link href="/planos" className="text-navy-700 underline">Criar conta de consultor</Link>
      </div>
    </form>
  );
}

export function SignUpForm({ plan }: { plan?: string }) {
  const [state, action, pending] = useActionState(signUpAction, {});
  if (state.message) return <Feedback state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="plan" value={plan ?? ''} />
      <div>
        <label htmlFor="fullName" className="field-label">Nome completo</label>
        <input id="fullName" name="fullName" required autoComplete="name" className="field-input" />
      </div>
      <div>
        <label htmlFor="email" className="field-label">E-mail profissional</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field-input" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Senha</label>
        <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="field-input" aria-describedby="pw-hint" />
        <p id="pw-hint" className="mt-1 text-xs text-muted">Mínimo de 10 caracteres, com letras e números.</p>
      </div>
      <Feedback state={state} />
      <button disabled={pending} className={submit}>{pending ? 'Criando conta…' : 'Criar conta'}</button>
      <p className="text-center text-sm text-muted">
        Já tem conta? <Link href="/entrar" className="text-navy-700 underline">Entrar</Link>
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="field-label">E-mail da conta</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field-input" />
      </div>
      <Feedback state={state} />
      <button disabled={pending} className={submit}>{pending ? 'Enviando…' : 'Enviar link de redefinição'}</button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className="field-label">Nova senha</label>
        <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="field-input" />
      </div>
      <div>
        <label htmlFor="confirm" className="field-label">Confirme a nova senha</label>
        <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="field-input" />
      </div>
      <Feedback state={state} />
      <button disabled={pending} className={submit}>{pending ? 'Salvando…' : 'Salvar nova senha'}</button>
    </form>
  );
}
