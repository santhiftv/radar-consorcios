import { redirect } from 'next/navigation';
import { createClient } from '../supabase/server';
import { roleHas, type AdminPermission, type AdminRole } from './permissions';

export interface SessionUser {
  id: string;
  email: string;
}

/** Usuário autenticado (validado no servidor do Supabase) ou redireciona ao login. */
export async function requireUser(next = '/painel'): Promise<{ user: SessionUser; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return { user: { id: data.user.id, email: data.user.email ?? '' }, supabase };
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? '' } : null;
}

export interface ConsultantContext {
  user: SessionUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: {
    user_id: string;
    full_name: string;
    professional_phone: string;
    city: string;
    state: string;
    company: string | null;
    professional_reference: string | null;
    verification_status: 'pending' | 'verified' | 'rejected' | 'suspended';
    terms_accepted_at: string | null;
    onboarding_completed_at: string | null;
    intended_plan_code: string | null;
  } | null;
}

/** Consultor autenticado. Sem perfil profissional completo → onboarding. */
export async function requireConsultant(opts: { allowIncomplete?: boolean; next?: string } = {}): Promise<ConsultantContext> {
  const { user, supabase } = await requireUser(opts.next ?? '/painel');
  const { data: profile } = await supabase
    .from('consultant_profiles')
    .select('user_id, full_name, professional_phone, city, state, company, professional_reference, verification_status, terms_accepted_at, onboarding_completed_at, intended_plan_code')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!opts.allowIncomplete && (!profile || !profile.onboarding_completed_at || !profile.terms_accepted_at)) {
    redirect('/painel/onboarding');
  }
  return { user, supabase, profile: (profile as ConsultantContext['profile']) ?? null };
}

export interface AdminContext {
  user: SessionUser;
  role: AdminRole;
}

/** Administrador ativo com a permissão exigida. Consultor comum nunca passa. */
export async function requireAdmin(permission: AdminPermission): Promise<AdminContext> {
  const { user, supabase } = await requireUser('/admin');
  const { data } = await supabase.from('platform_admins').select('role, active').eq('user_id', user.id).maybeSingle();
  if (!data || !data.active) redirect('/painel');
  const role = data.role as AdminRole;
  if (!roleHas(role, permission)) redirect('/admin?sem-permissao=1');
  return { user, role };
}

export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('platform_admins').select('role, active').eq('user_id', userId).maybeSingle();
  return data?.active ? (data.role as AdminRole) : null;
}
