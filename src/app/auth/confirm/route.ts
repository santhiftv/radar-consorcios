import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Destino dos links de e-mail do Supabase Auth (confirmação de cadastro e
 * recuperação de senha). Aceita os dois formatos:
 *  - ?token_hash=...&type=signup|recovery|email  (template recomendado)
 *  - ?code=...                                   (fluxo PKCE padrão)
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const rawNext = url.searchParams.get('next') ?? '/painel';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/painel';
  const supabase = await createClient();

  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const target = url.clone();
  target.search = '';
  if (ok) {
    const [path, query] = next.split('?');
    target.pathname = path ?? '/painel';
    if (query) target.search = `?${query}`;
  } else {
    target.pathname = '/entrar';
    target.search = '?erro=link';
  }
  return NextResponse.redirect(target);
}
