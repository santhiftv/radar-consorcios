'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { cleanText, isUuid } from '@/lib/domain/validation';
import { createAdminClient } from '@/lib/server/deps';
import type { ActionState } from '@/app/painel/actions';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

/** Salva preço, limite (ou "sem limite"), urgência máxima recebida e demais regras do plano. */
export async function savePlanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdmin('plans');
  const db = createAdminClient({ actorId: ctx.user.id });
  const id = str(fd, 'id');
  const price = Math.round(Number(str(fd, 'price').replace(',', '.')) * 100);
  const claimLimit = Number(str(fd, 'claimLimit'));
  const claimsUnlimited = fd.get('claimsUnlimited') === 'on';
  const maxRegions = str(fd, 'maxRegions') ? Number(str(fd, 'maxRegions')) : null;
  const delay = Number(str(fd, 'priorityDelaySeconds'));
  const maxLeadUrgency = Number(str(fd, 'maxLeadUrgency'));
  if (
    !isUuid(id) || !Number.isFinite(price) || price < 0 ||
    !Number.isInteger(claimLimit) || claimLimit < 0 ||
    !Number.isInteger(delay) || delay < 0 ||
    !Number.isInteger(maxLeadUrgency) || maxLeadUrgency < 0 || maxLeadUrgency > 10 ||
    (maxRegions != null && (!Number.isInteger(maxRegions) || maxRegions < 1))
  ) {
    return { error: 'Valores inválidos.' };
  }
  const features = str(fd, 'features').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12);
  const { error } = await db
    .from('plans')
    .update({
      name: cleanText(fd.get('name'), 60) ?? undefined,
      price_cents: price,
      claim_limit: claimLimit,
      claims_unlimited: claimsUnlimited,
      max_lead_urgency: maxLeadUrgency,
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
  revalidatePath('/');
  revalidatePath('/admin/planos');
  return { ok: true, message: 'Plano atualizado. Assinantes atuais passam a ter o novo limite/preço na renovação.' };
}
