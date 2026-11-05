'use server';

import { redirect } from 'next/navigation';
import { normalizeEmail } from '@/lib/domain/validation';
import { createClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/server/env';

export interface AuthState {
  error?: string;
  message?: string;
}

function safeNext(raw: unknown, fallback = '/painel'): string {
  const v = typeof raw === 'string' ? raw : '';
  // apenas caminhos internos (evita open redirect)
  return v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') ? v : fallback;
}

function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return 'A senha deve ter pelo menos 10 caracteres.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use letras e números na senha.';
  return null;
}

export async function signInAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(formData.get('email'));
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Informe e-mail e senha.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.' };
    return { error: 'E-mail ou senha incorretos.' };
  }
  redirect(safeNext(formData.get('next')));
}

export async function signUpAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(formData.get('email'));
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim().slice(0, 120);
  const plan = String(formData.get('plan') ?? '').replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  if (!email) return { error: 'Informe um e-mail válido.' };
  if (fullName.length < 3) return { error: 'Informe seu nome completo.' };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };

  const supabase = await createClient();
  const next = `/painel/onboarding${plan ? `?plano=${plan}` : ''}`;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, intended_plan: plan || null },
      emailRedirectTo: `${serverEnv.siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (/already|registered/i.test(error.message)) return { error: 'Este e-mail já possui conta. Entre ou recupere a senha.' };
    return { error: 'Não foi possível criar a conta agora. Tente novamente.' };
  }
  // Mensagem neutra (não confirma se o e-mail já existia)
  return { message: 'Enviamos um link de confirmação para o seu e-mail. Abra-o para continuar o cadastro.' };
}

export async function requestPasswordResetAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(formData.get('email'));
  if (!email) return { error: 'Informe um e-mail válido.' };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${serverEnv.siteUrl}/auth/confirm?next=${encodeURIComponent('/redefinir-senha')}`,
  });
  return { message: 'Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.' };
}

export async function updatePasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  if (password !== confirm) return { error: 'As senhas não conferem.' };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: 'Link expirado. Solicite uma nova redefinição.' };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Não foi possível atualizar a senha. Tente novamente.' };
  redirect('/painel?senha=atualizada');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/entrar');
}
