import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireEnv, serverEnv } from '../server/env';
import type { Rpc } from '../services/types';

/**
 * Cliente com a chave SECRETA (ignora RLS). Uso exclusivo no servidor, depois
 * de verificar autenticação e permissão. O cabeçalho x-actor-id identifica o
 * administrador nos logs de auditoria do banco.
 */
export function createAdminClient(opts: { actorId?: string | null } = {}) {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient não pode ser usado no navegador');
  }
  return createSupabaseClient(
    requireEnv(serverEnv.supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(serverEnv.supabaseSecretKey, 'SUPABASE_SECRET_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: opts.actorId ? { 'x-actor-id': opts.actorId } : {} },
    },
  );
}

export function serviceRpc(actorId?: string | null): Rpc {
  const client = createAdminClient({ actorId });
  return ((fn: string, args?: Record<string, unknown>) => client.rpc(fn, args)) as Rpc;
}
