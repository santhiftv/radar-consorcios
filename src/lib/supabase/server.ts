import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireEnv, serverEnv } from '../server/env';

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers,
 * autenticado com a sessão do usuário (cookies). Sujeito a RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv(serverEnv.supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(serverEnv.supabasePublishableKey, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado a partir de um Server Component: o proxy.ts renova a sessão.
          }
        },
      },
    },
  );
}
