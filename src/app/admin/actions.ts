'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import type { AdminPermission } from '@/lib/auth/permissions';
import { slugify } from '@/lib/domain/slug';
import { mapPreapprovalStatus, addMonths } from '@/lib/domain/subscription';
import { cleanText, isUF, isUuid, normalizeEmail, normalizePhoneBR } from '@/lib/domain/validation';
import { ARTICLE_CATEGORIES } from '@/lib/domain/editorial';
import { createAdminClient, paymentProvider, serviceRpc } from '@/lib/server/deps';
import { logger } from '@/lib/services/log';
import type { ActionState } from '@/app/painel/actions';

/** Cliente privilegiado com o administrador identificado na auditoria. */
async function adminDb(permission: AdminPermission) {
  const ctx = await requireAdmin(permission);
  return { ctx, db: createAdminClient({ actorId: ctx.user.id }), rpc: serviceRpc(ctx.user.id) };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const done = (path: string, message = 'Salvo.'): ActionState => {
  revalidatePath(path);
  return { ok: true, message };
};

// ----------------------------------------------------------------------------- consultores
export async function verifyConsultantAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, db } = await adminDb('consultants');
  const userId = str(fd, 'userId');
  const status = str(fd, 'status');
  if (!isUuid(userId) || !['pending', 'verified', 'rejected', 'suspended'].includes(status)) return { error: 'Dados inválidos.' };
  const notes = cleanText(fd.get('notes'), 500);
  if (['rejected', 'suspended'].includes(status) && !notes) return { error: 'Informe o motivo.' };
  const { error } = await db
    .from('consultant_profiles')
    .update({ verification_status: status, verification_notes: notes, verified_by: ctx.user.id, verified_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) return { error: 'Falha ao atualizar.' };
  return done('/admin/consultores', 'Status do consultor atualizado.');
}

export async function reviewEligibilityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, db } = await adminDb('consultants');
  const consultantId = str(fd, 'consultantId');
  const administratorId = str(fd, 'administratorId');
  const status = str(fd, 'status');
  if (!isUuid(consultantId) || !isUuid(administratorId) || !['verified', 'rejected', 'revoked', 'pending'].includes(status)) return { error: 'Dados inválidos.' };
  const { error } = await db
    .from('administrator_eligibility')
    .update({ status, reviewed_by: ctx.user.id, reviewed_at: new Date().toISOString() })
    .eq('consultant_id', consultantId)
    .eq('administrator_id', administratorId);
  if (error) return { error: 'Falha ao atualizar.' };
  return done('/admin/consultores', 'Habilitação revisada.');
}

export async function replyTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, db } = await adminDb('consultants');
  const id = str(fd, 'ticketId');
  const reply = str(fd, 'reply').slice(0, 5000);
  if (!isUuid(id) || reply.length < 2) return { error: 'Escreva a resposta.' };
  const { error } = await db
    .from('support_tickets')
    .update({ admin_reply: reply, status: fd.get('close') === 'on' ? 'closed' : 'answered', answered_by: ctx.user.id, answered_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: 'Falha ao responder.' };
  return done('/admin/consultores', 'Resposta registrada.');
}

// ----------------------------------------------------------------------------- planos
export async function updatePlanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb('plans');
  const id = str(fd, 'id');
  const price = Math.round(Number(str(fd, 'price').replace(',', '.')) * 100);
  const claimLimit = Number(str(fd, 'claimLimit'));
  const maxRegions = str(fd, 'maxRegions') ? Number(str(fd, 'maxRegions')) : null;
  const delay = Number(str(fd, 'priorityDelaySeconds'));
  if (!isUuid(id) || !Number.isFinite(price) || price < 0 || !Number.isInteger(claimLimit) || claimLimit < 0 || !Number.isInteger(delay) || delay < 0) {
    return { error: 'Valores inválidos.' };
  }
  const features = str(fd, 'features').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12);
  const { error } = await db
    .from('plans')
    .update({
      name: cleanText(fd.get('name'), 60) ?? undefined,
      price_cents: price,
      claim_limit: claimLimit,
      max_regions: maxRegions,
      priority_delay_seconds: delay,
      allowed_filters: fd.getAll('allowedFilters').map(String),
      features,
      active: fd.get('active') === 'on',
      provider_plan_id: cleanText(fd.get('providerPlanId'), 120),
    })
    .eq('id', id);
  if (error) return { error: `Falha ao salvar: ${error.message}` };
  revalidatePath('/planos');
  return done('/admin/planos', 'Plano atualizado. Assinantes atuais passam a ter o novo limite/preço na renovação.');
}

// ----------------------------------------------------------------------------- catálogo
export async function saveAdministratorAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb('catalog');
  const id = str(fd, 'id');
  const name = cleanText(fd.get('name'), 120);
  if (!name) return { error: 'Informe o nome.' };
  const row = {
    name,
    slug: slugify(str(fd, 'slug') || name, 80),
    requires_verification: fd.get('requiresVerification') === 'on',
    active: fd.get('active') === 'on',
    notes: cleanText(fd.get('notes'), 500),
  };
  const { error } = isUuid(id) ? await db.from('administrators').update(row).eq('id', id) : await db.from('administrators').insert(row);
  if (error) return { error: error.code === '23505' ? 'Slug já existe.' : 'Falha ao salvar.' };
  return done('/admin/administradoras');
}

export async function saveModalityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb('catalog');
  const id = slugify(str(fd, 'id'), 40).replace(/-/g, '_');
  const name = cleanText(fd.get('name'), 60);
  if (!id || !name) return { error: 'Informe identificador e nome.' };
  const { error } = await db.from('modalities').upsert({
    id,
    name,
    description: cleanText(fd.get('description'), 200),
    active: fd.get('active') === 'on',
    sort_order: Number(str(fd, 'sortOrder')) || 100,
  });
  if (error) return { error: 'Falha ao salvar.' };
  return done('/admin/modalidades');
}

export async function saveRegionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb('catalog');
  const id = str(fd, 'id');
  const state = str(fd, 'state').toUpperCase();
  const city = cleanText(fd.get('city'), 80);
  if (!isUF(state)) return { error: 'UF inválida.' };
  const row = { state, city, label: cleanText(fd.get('label'), 100) ?? (city ? `${city}/${state}` : `${state} (todo o estado)`), active: fd.get('active') === 'on' };
  const { error } = isUuid(id) ? await db.from('regions').update(row).eq('id', id) : await db.from('regions').insert(row);
  if (error) return { error: error.code === '23505' ? 'Região já cadastrada.' : 'Falha ao salvar.' };
  return done('/admin/regioes');
}

// ----------------------------------------------------------------------------- blog
export async function saveArticleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb('content');
  const id = str(fd, 'id');
  const title = cleanText(fd.get('title'), 160);
  const category = str(fd, 'category');
  if (!title || title.length < 10) return { error: 'Título com pelo menos 10 caracteres.' };
  if (!(ARTICLE_CATEGORIES as readonly string[]).includes(category)) return { error: 'Categoria inválida.' };
  const row = {
    title,
    slug: slugify(str(fd, 'slug') || title),
    summary: str(fd, 'summary').slice(0, 400),
    content_md: str(fd, 'content').slice(0, 60_000),
    meta_description: cleanText(fd.get('metaDescription'), 170),
    category,
    tags: str(fd, 'tags').split(',').map((t) => slugify(t, 30)).filter(Boolean).slice(0, 8),
    author_name: cleanText(fd.get('authorName'), 100),
    cover_image_url: /^https:\/\//.test(str(fd, 'coverImageUrl')) ? str(fd, 'coverImageUrl') : null,
    cover_image_alt: cleanText(fd.get('coverImageAlt'), 200),
    content_updated_at: new Date().toISOString(),
  };
  let articleId = id;
  if (isUuid(id)) {
    const { error } = await db.from('articles').update(row).eq('id', id).neq('status', 'archived');
    if (error) return { error: error.code === '23505' ? 'Slug já usado.' : 'Falha ao salvar.' };
  } else {
    const { data, error } = await db.from('articles').insert({ ...row, status: 'in_review' }).select('id').single();
    if (error) return { error: error.code === '23505' ? 'Slug já usado.' : 'Falha ao salvar.' };
    articleId = data.id;
  }
  // Fontes: uma por linha "URL | título | publicador"
  const sources = str(fd, 'sources').split('\n').map((l) => l.trim()).filter((l) => /^https?:\/\//.test(l));
  await db.from('article_sources').delete().eq('article_id', articleId);
  if (sources.length) {
    await db.from('article_sources').insert(
      sources.slice(0, 30).map((l) => {
        const [url, t, publisher] = l.split('|').map((s) => s.trim());
        return { article_id: articleId, url, title: t || null, publisher: publisher || null };
      }),
    );
  }
  revalidatePath(`/blog/${row.slug}`);
  return done('/admin/blog', 'Artigo salvo (em revisão).');
}

export async function publishArticleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { rpc } = await adminDb('content');
  const id = str(fd, 'id');
  const { data, error } = await rpc<{ slug: string }>('admin_publish_article', {
    p_article_id: id,
    p_reviewer_name: cleanText(fd.get('reviewerName'), 100),
    p_ack_flags: fd.get('ackFlags') === 'on',
  });
  if (error) {
    const m = error.message;
    if (m.includes('FLAGS_NOT_ACKNOWLEDGED')) return { error: 'Revise e reconheça os alertas editoriais antes de publicar.' };
    if (m.includes('SOURCES_REQUIRED')) return { error: 'Artigos de mercado/notícia exigem fontes.' };
    if (m.includes('REVIEWER_REQUIRED')) return { error: 'Informe o nome do revisor.' };
    return { error: 'Não foi possível publicar.' };
  }
  revalidatePath('/blog');
  revalidatePath(`/blog/${data?.slug}`);
  revalidatePath('/sitemap.xml');
  revalidatePath('/');
  return done('/admin/blog', 'Publicado. Sitemap atualizado.');
}

export async function setArticleStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb('content');
  const id = str(fd, 'id');
  const status = str(fd, 'status');
  if (!isUuid(id) || !['rejected', 'archived', 'in_review'].includes(status)) return { error: 'Ação inválida.' };
  const { data } = await db.from('articles').update({ status }).eq('id', id).select('slug').single();
  revalidatePath('/blog');
  if (data?.slug) revalidatePath(`/blog/${data.slug}`);
  revalidatePath('/sitemap.xml');
  return done('/admin/blog', 'Status atualizado.');
}

export async function editorialScheduleAction(_: ActionState): Promise<ActionState> {
  const { rpc } = await adminDb('content');
  const { data, error } = await rpc<number>('schedule_editorial_week', {});
  if (error) return { error: 'Falha ao agendar.' };
  return done('/admin/blog', `${data ?? 0} pauta(s) criada(s) para a próxima semana.`);
}

// ----------------------------------------------------------------------------- leads
export async function adminLeadAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { rpc } = await adminDb('leads');
  const action = str(fd, 'action');
  const { error } = await rpc('admin_set_lead_status', {
    p_lead_id: str(fd, 'leadId'),
    p_action: action,
    p_reason: cleanText(fd.get('reason'), 300),
  });
  if (error) {
    if (error.message.includes('REASON_REQUIRED')) return { error: 'Informe o motivo (mínimo 5 caracteres; fica registrado).' };
    if (error.message.includes('LEAD_NOT_ACTIONABLE')) return { error: 'Este lead já está encerrado.' };
    return { error: 'Não foi possível aplicar a ação.' };
  }
  return done('/admin/leads', action === 'withdraw' ? 'Lead retirado; consultor avisado e saldo devolvido.' : 'Lead invalidado; saldo devolvido ao consultor, se havia atribuição.');
}

export async function revealLeadContactAction(leadId: string) {
  const { ctx, db } = await adminDb('leads');
  if (!isUuid(leadId)) return null;
  const { data } = await db.from('leads').select('lead_requests(full_name, email, phone_e164)').eq('id', leadId).single();
  await db.from('audit_logs').insert({ actor_id: ctx.user.id, actor_kind: 'admin', action: 'VIEW_LEAD_CONTACT', table_name: 'leads', record_id: leadId });
  return (data as unknown as { lead_requests: { full_name: string | null; email: string | null; phone_e164: string | null } } | null)?.lead_requests ?? null;
}

// ----------------------------------------------------------------------------- contestações
export async function resolveContestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { rpc } = await adminDb('contests');
  const { error } = await rpc('admin_resolve_contest', {
    p_contest_id: str(fd, 'contestId'),
    p_accept: str(fd, 'decision') === 'accept',
    p_note: cleanText(fd.get('note'), 500),
  });
  if (error) return { error: error.message.includes('RESOLUTION_NOTE_REQUIRED') ? 'Escreva a justificativa.' : 'Não foi possível resolver.' };
  return done('/admin/contestacoes', 'Contestação resolvida e consultor notificado.');
}

// ----------------------------------------------------------------------------- privacidade
export async function exportSubjectDataAction(requestId: string) {
  const { rpc } = await adminDb('privacy');
  const { data, error } = await rpc('admin_export_subject_data', { p_request_id: requestId });
  if (error) return { error: 'Solicitação não confirmada ou sem permissão.' };
  return { data };
}

export async function completeDeletionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { rpc } = await adminDb('privacy');
  const { data, error } = await rpc<{ anonymized_requests: number }>('admin_complete_deletion', {
    p_request_id: str(fd, 'requestId'),
    p_note: cleanText(fd.get('note'), 500),
  });
  if (error) return { error: 'Não foi possível concluir a exclusão.' };
  return done('/admin/privacidade', `Dados anonimizados (${data?.anonymized_requests ?? 0} solicitação(ões)).`);
}

export async function resolvePrivacyRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, db } = await adminDb('privacy');
  const id = str(fd, 'requestId');
  const status = str(fd, 'status');
  const note = cleanText(fd.get('note'), 1000);
  if (!isUuid(id) || !['completed', 'rejected', 'in_progress'].includes(status) || !note) return { error: 'Informe o desfecho e a justificativa.' };
  const { error } = await db
    .from('privacy_requests')
    .update({ status, resolution_note: note, handled_by: ctx.user.id, completed_at: status === 'in_progress' ? null : new Date().toISOString() })
    .eq('id', id)
    .in('status', ['open', 'in_progress']);
  if (error) return { error: 'Falha ao atualizar.' };
  return done('/admin/privacidade', 'Solicitação atualizada.');
}

export async function correctLeadRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb('privacy');
  const id = str(fd, 'leadRequestId');
  const email = str(fd, 'email') ? normalizeEmail(fd.get('email')) : undefined;
  const phone = str(fd, 'phone') ? normalizePhoneBR(fd.get('phone')) : undefined;
  if (!isUuid(id) || email === null || phone === null) return { error: 'Dados inválidos.' };
  const patch: Record<string, string> = {};
  const name = cleanText(fd.get('fullName'), 120);
  if (name) patch.full_name = name;
  if (email) patch.email = email;
  if (phone) patch.phone_e164 = phone;
  if (!Object.keys(patch).length) return { error: 'Nada a corrigir.' };
  const { error } = await db.from('lead_requests').update(patch).eq('id', id).neq('status', 'anonymized');
  if (error) return { error: 'Falha ao corrigir.' };
  return done('/admin/privacidade', 'Dados corrigidos.');
}

// ----------------------------------------------------------------------------- notificações e assinaturas
export async function retryDeliveryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb('notifications');
  const id = str(fd, 'deliveryId');
  if (!isUuid(id)) return { error: 'Inválido.' };
  const { error } = await db
    .from('notification_deliveries')
    .update({ status: 'pending', attempts: 0, next_attempt_at: new Date().toISOString(), last_error: null })
    .eq('id', id)
    .in('status', ['failed', 'dead']);
  if (error) return { error: 'Falha.' };
  return done('/admin/notificacoes', 'Reenvio agendado.');
}

export async function syncSubscriptionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { rpc, db } = await adminDb('billing');
  const id = str(fd, 'subscriptionId');
  const { data: sub } = await db.from('subscriptions').select('id, provider_subscription_id, current_period_end').eq('id', id).maybeSingle();
  if (!sub?.provider_subscription_id) return { error: 'Assinatura sem vínculo com o provedor.' };
  try {
    const remote = await paymentProvider().getSubscription(sub.provider_subscription_id);
    const status = mapPreapprovalStatus(remote.status);
    if (!status) return { error: `Status do provedor desconhecido: ${remote.status}` };
    const now = new Date();
    const p: Record<string, unknown> = { subscription_id: sub.id, status, provider_status: remote.status };
    if (status === 'active' && !sub.current_period_end) {
      p.period_start = now.toISOString();
      p.period_end = addMonths(now, 1).toISOString();
      p.renew = true;
    }
    const { error } = await rpc('apply_subscription_update', { p });
    if (error) return { error: 'Falha ao aplicar o estado.' };
    return done('/admin/assinaturas', `Sincronizado: provedor = ${remote.status}.`);
  } catch (e) {
    logger.error('admin_sync_failed', { error: (e as Error).message });
    return { error: 'O provedor não respondeu.' };
  }
}

// ----------------------------------------------------------------------------- configurações
export async function saveSettingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, db } = await adminDb('settings');
  const key = str(fd, 'key');
  let value: unknown;
  try {
    value = JSON.parse(str(fd, 'value'));
  } catch {
    return { error: 'Valor deve ser JSON válido (números sem aspas, textos entre aspas).' };
  }
  const { error } = await db.from('app_settings').update({ value, updated_by: ctx.user.id }).eq('key', key);
  if (error) return { error: 'Falha ao salvar.' };
  return done('/admin/configuracoes', `Configuração "${key}" atualizada.`);
}
