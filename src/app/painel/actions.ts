'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CONSULTANT_TERMS_VERSION } from '@/content/legal';
import { findBand, CREDIT_BANDS, INSTALLMENT_BANDS } from '@/lib/domain/bands';
import { friendlyPlanError } from '@/lib/domain/plans';
import { cleanText, isUF, isUuid, normalizePhoneBR } from '@/lib/domain/validation';
import { requireConsultant, requireUser } from '@/lib/auth/guards';
import { createAdminClient, paymentProvider } from '@/lib/server/deps';
import { logger } from '@/lib/services/log';

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
}

const ids = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(isUuid);
const slugs = (fd: FormData, key: string) => fd.getAll(key).map(String).filter((v) => /^[a-z0-9_-]{2,40}$/.test(v));

// -----------------------------------------------------------------------------
// Onboarding: perfil profissional + termos + regiões/modalidades iniciais
// -----------------------------------------------------------------------------
export async function saveOnboardingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, supabase, profile } = await requireConsultant({ allowIncomplete: true });
  const fields: Record<string, string> = {};
  const fullName = cleanText(fd.get('fullName'), 120);
  const phone = normalizePhoneBR(fd.get('phone'));
  const city = cleanText(fd.get('city'), 80);
  const state = String(fd.get('state') ?? '').toUpperCase();
  if (!fullName || fullName.length < 3) fields.fullName = 'Informe o nome completo.';
  if (!phone) fields.phone = 'Telefone profissional inválido.';
  if (!city) fields.city = 'Informe a cidade.';
  if (!isUF(state)) fields.state = 'Selecione a UF.';
  if (fd.get('terms') !== 'on') fields.terms = 'É necessário aceitar os termos do consultor.';
  const regionIds = ids(fd, 'regionIds');
  const modalities = slugs(fd, 'modalities');
  if (regionIds.length === 0) fields.regionIds = 'Selecione ao menos uma região de atendimento.';
  if (Object.keys(fields).length) return { error: 'Revise os campos destacados.', fields };

  const plan = slugs(fd, 'plan')[0] ?? profile?.intended_plan_code ?? null;
  const now = new Date().toISOString();
  const row = {
    user_id: user.id,
    full_name: fullName!,
    professional_phone: phone!,
    city: city!,
    state,
    company: cleanText(fd.get('company'), 120),
    professional_reference: cleanText(fd.get('professionalReference'), 200),
    terms_version: CONSULTANT_TERMS_VERSION,
    terms_accepted_at: now,
    onboarding_completed_at: now,
    intended_plan_code: plan,
  };
  const { error } = profile
    ? await supabase.from('consultant_profiles').update(row).eq('user_id', user.id)
    : await supabase.from('consultant_profiles').insert(row);
  if (error) {
    if (error.code === '23505') return { error: 'Este telefone profissional já está em uso por outra conta.', fields: { phone: 'Já cadastrado' } };
    logger.error('onboarding_profile_failed', { code: error.code });
    return { error: 'Não foi possível salvar o perfil.' };
  }

  const prefs = await supabase.from('lead_preferences').upsert({ consultant_id: user.id, region_ids: regionIds, modalities }, { onConflict: 'consultant_id' });
  if (prefs.error) return { error: friendlyPlanError(prefs.error.message) };

  for (const administratorId of ids(fd, 'administratorIds')) {
    await supabase.from('administrator_eligibility').upsert(
      { consultant_id: user.id, administrator_id: administratorId, evidence_note: cleanText(fd.get(`evidence_${administratorId}`), 500) },
      { onConflict: 'consultant_id,administrator_id', ignoreDuplicates: true },
    );
  }

  // Registro do aceite dos termos (prova de consentimento contratual)
  await createAdminClient({ actorId: user.id }).from('consent_records').insert({
    consultant_id: user.id,
    purpose: 'consultant_terms',
    granted: true,
    notice_version: CONSULTANT_TERMS_VERSION,
    source: 'onboarding',
  });

  redirect(`/painel/assinatura${plan ? `?plano=${plan}` : ''}`);
}

// -----------------------------------------------------------------------------
// Reivindicação, status, contestação
// -----------------------------------------------------------------------------
const CLAIM_MESSAGES: Record<string, string> = {
  already_taken: 'Outro consultor concluiu a reivindicação primeiro.',
  priority_window: 'Esta oportunidade ainda está na janela de prioridade de outro plano.',
  quota_exceeded: 'Seu saldo de reivindicações deste ciclo acabou.',
  subscription_inactive: 'Sua assinatura não está ativa.',
  not_eligible: 'Esta oportunidade não é compatível com seu perfil ou habilitação.',
  profile_blocked: 'Seu perfil está bloqueado para reivindicações. Fale com o suporte.',
  rate_limited: 'Muitas tentativas seguidas. Aguarde um minuto.',
  not_found: 'Oportunidade não encontrada.',
  insufficient_tokens: 'Você está sem tokens. Aguarde a cota semanal ou compre tokens avulsos em Tokens e saldo.',
  premium_only: 'Oportunidade exclusiva do plano Premium (alta urgência).',
};

export async function claimLeadAction(leadId: string): Promise<ActionState & { assignmentId?: string }> {
  if (!isUuid(leadId)) return { error: 'Oportunidade inválida.' };
  const { supabase } = await requireConsultant();
  const { data, error } = await supabase.rpc('claim_lead', { p_lead_id: leadId });
  if (error) {
    logger.error('claim_rpc_failed', { code: error.code });
    return { error: 'Não foi possível concluir agora. Tente novamente.' };
  }
  const r = data as { ok: boolean; reason?: string; assignment_id?: string; remaining?: number };
  revalidatePath('/painel', 'layout');
  if (!r.ok) return { error: CLAIM_MESSAGES[r.reason ?? ''] ?? 'Reivindicação não concluída.' };
  return { ok: true, assignmentId: r.assignment_id, message: `Oportunidade sua! Saldo restante: ${r.remaining}.` };
}

export async function updateAssignmentStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireConsultant();
  const assignmentId = String(fd.get('assignmentId') ?? '');
  const status = String(fd.get('status') ?? '');
  if (!isUuid(assignmentId)) return { error: 'Atribuição inválida.' };
  const { error } = await supabase.rpc('update_assignment_status', {
    p_assignment_id: assignmentId,
    p_status: status,
    p_note: cleanText(fd.get('note'), 1000),
  });
  if (error) return { error: error.message.includes('INVALID_TRANSITION') ? 'Mudança de status não permitida.' : 'Não foi possível atualizar.' };
  revalidatePath('/painel', 'layout');
  return { ok: true, message: 'Status atualizado.' };
}

export async function createContestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireConsultant();
  const assignmentId = String(fd.get('assignmentId') ?? '');
  const reason = String(fd.get('reason') ?? '');
  if (!isUuid(assignmentId)) return { error: 'Atribuição inválida.' };
  const { error } = await supabase.rpc('create_lead_contest', {
    p_assignment_id: assignmentId,
    p_reason: reason,
    p_details: cleanText(fd.get('details'), 1000),
  });
  if (error) {
    if (error.message.includes('CONTEST_WINDOW_CLOSED')) return { error: 'O prazo de contestação (7 dias) terminou.' };
    if (error.code === '23505') return { error: 'Esta atribuição já foi contestada.' };
    return { error: 'Não foi possível registrar a contestação.' };
  }
  revalidatePath('/painel', 'layout');
  return { ok: true, message: 'Contestação enviada para análise.' };
}

// -----------------------------------------------------------------------------
// Preferências
// -----------------------------------------------------------------------------
export async function savePreferencesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, supabase } = await requireConsultant();
  const credit = findBand(CREDIT_BANDS, String(fd.get('creditBand') ?? ''));
  const creditMax = findBand(CREDIT_BANDS, String(fd.get('creditBandMax') ?? ''));
  const inst = findBand(INSTALLMENT_BANDS, String(fd.get('installmentBand') ?? ''));
  const instMax = findBand(INSTALLMENT_BANDS, String(fd.get('installmentBandMax') ?? ''));
  const termMin = Number(fd.get('termMin')) || null;
  const termMax = Number(fd.get('termMax')) || null;
  const quietStart = String(fd.get('quietStart') ?? '');
  const quietEnd = String(fd.get('quietEnd') ?? '');
  const timeRe = /^\d{2}:\d{2}$/;

  const row = {
    consultant_id: user.id,
    region_ids: ids(fd, 'regionIds'),
    modalities: slugs(fd, 'modalities'),
    credit_min_cents: credit?.minCents ?? (credit ? 0 : null),
    credit_max_cents: creditMax ? creditMax.maxCents : null,
    installment_min_cents: inst?.minCents ?? (inst ? 0 : null),
    installment_max_cents: instMax ? instMax.maxCents : null,
    term_min_months: termMin,
    term_max_months: termMax,
    administrator_ids: ids(fd, 'administratorFilter'),
    notify_email: fd.get('notifyEmail') === 'on',
    notify_inapp: fd.get('notifyInapp') === 'on',
    quiet_hours_start: timeRe.test(quietStart) ? quietStart : null,
    quiet_hours_end: timeRe.test(quietEnd) ? quietEnd : null,
  };
  if (row.region_ids.length === 0) return { error: 'Selecione ao menos uma região.' };
  const { error } = await supabase.from('lead_preferences').upsert(row, { onConflict: 'consultant_id' });
  if (error) return { error: error.message.includes('PLAN_') ? friendlyPlanError(error.message) : 'Não foi possível salvar (verifique as faixas).' };
  revalidatePath('/painel', 'layout');
  return { ok: true, message: 'Preferências salvas. Elas valem para as próximas oportunidades.' };
}

export async function declareEligibilityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, supabase } = await requireConsultant();
  const administratorId = String(fd.get('administratorId') ?? '');
  if (!isUuid(administratorId)) return { error: 'Selecione a administradora.' };
  const { error } = await supabase.from('administrator_eligibility').insert({
    consultant_id: user.id,
    administrator_id: administratorId,
    evidence_note: cleanText(fd.get('evidence'), 500),
  });
  if (error) return { error: error.code === '23505' ? 'Você já declarou esta administradora.' : 'Não foi possível registrar.' };
  revalidatePath('/painel/perfil');
  return { ok: true, message: 'Declaração enviada. Aguarde a verificação da equipe.' };
}

// -----------------------------------------------------------------------------
// Perfil, notificações, suporte, assinatura
// -----------------------------------------------------------------------------
export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, supabase } = await requireConsultant();
  const phone = normalizePhoneBR(fd.get('phone'));
  const state = String(fd.get('state') ?? '').toUpperCase();
  if (!phone || !isUF(state)) return { error: 'Revise telefone e UF.' };
  const { error } = await supabase
    .from('consultant_profiles')
    .update({
      full_name: cleanText(fd.get('fullName'), 120) ?? undefined,
      professional_phone: phone,
      city: cleanText(fd.get('city'), 80) ?? undefined,
      state,
      company: cleanText(fd.get('company'), 120),
      professional_reference: cleanText(fd.get('professionalReference'), 200),
    })
    .eq('user_id', user.id);
  if (error) return { error: error.code === '23505' ? 'Telefone já usado em outra conta.' : 'Não foi possível salvar.' };
  revalidatePath('/painel/perfil');
  return { ok: true, message: 'Perfil atualizado.' };
}

export async function markNotificationsReadAction() {
  const { user, supabase } = await requireUser();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).is('read_at', null);
  revalidatePath('/painel', 'layout');
}

export async function createTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, supabase } = await requireConsultant();
  const subject = cleanText(fd.get('subject'), 160);
  const message = typeof fd.get('message') === 'string' ? String(fd.get('message')).trim().slice(0, 5000) : '';
  const kind = ['support', 'billing', 'privacy'].includes(String(fd.get('kind'))) ? String(fd.get('kind')) : 'support';
  if (!subject || subject.length < 3 || message.length < 5) return { error: 'Preencha assunto e mensagem.' };
  const { error } = await supabase.from('support_tickets').insert({ consultant_id: user.id, kind, subject, message });
  if (error) return { error: 'Não foi possível abrir o chamado.' };
  revalidatePath('/painel/suporte');
  return { ok: true, message: 'Chamado aberto. Responderemos por aqui e por e-mail.' };
}

export async function cancelSubscriptionAction(_: ActionState): Promise<ActionState> {
  const { user, supabase } = await requireConsultant();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, provider_subscription_id, status, cancel_at_period_end')
    .in('status', ['active', 'past_due', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return { error: 'Nenhuma assinatura ativa.' };
  if (sub.cancel_at_period_end) return { message: 'O cancelamento já está agendado.' };
  if (sub.provider_subscription_id) {
    try {
      await paymentProvider().cancelSubscription(sub.provider_subscription_id);
    } catch (e) {
      logger.error('cancel_provider_failed', { error: (e as Error).message });
      return { error: 'O provedor de pagamento não confirmou o cancelamento. Tente novamente ou fale com o suporte.' };
    }
  }
  const { error } = await createAdminClient({ actorId: user.id })
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('id', sub.id)
    .eq('consultant_id', user.id);
  if (error) return { error: 'Cancelado no provedor, mas não registrado aqui. Fale com o suporte.' };
  revalidatePath('/painel', 'layout');
  return { ok: true, message: 'Renovação cancelada. Seu acesso continua até o fim do ciclo pago.' };
}
