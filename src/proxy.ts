import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (antigo "middleware" no Next.js 16): renova a sessão do Supabase e
 * protege as áreas privadas. A autorização fina (consultor/admin/permissões)
 * é verificada novamente no servidor de cada página e no banco (RLS).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Não coloque lógica entre a criação do cliente e getUser() (recomendação do Supabase).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPrivate = path.startsWith('/painel') || path.startsWith('/admin');
  if (isPrivate && !user) {
    const login = request.nextUrl.clone();
    login.pathname = '/entrar';
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // Ignora estáticos, imagens, webhooks e cron (que têm autenticação própria)
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks|api/cron|api/integrations|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
