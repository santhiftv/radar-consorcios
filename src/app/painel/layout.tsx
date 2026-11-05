import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOutAction } from '@/app/(auth)/actions';
import { Logo } from '@/components/site-header';
import { PanelNav } from '@/components/panel/panel-nav';
import { RealtimeListener } from '@/components/panel/realtime-listener';
import { getAdminRole, requireUser } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Painel do consultor', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await requireUser('/painel');
  const [{ data: profile }, adminRole, { count: unread }] = await Promise.all([
    supabase.from('consultant_profiles').select('full_name, verification_status').eq('user_id', user.id).maybeSingle(),
    getAdminRole(user.id),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ]);
  // Equipe interna sem perfil de consultor vai para o painel administrativo
  if (adminRole && !profile) redirect('/admin');

  return (
    <div className="min-h-dvh bg-navy-50">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            {adminRole && <Link href="/admin" className="rounded-lg border border-line px-3 py-1.5 font-medium">Admin</Link>}
            <Link href="/painel" className="relative rounded-lg px-2 py-1.5" aria-label={`Notificações: ${unread ?? 0} não lidas`}>
              🔔{(unread ?? 0) > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-brand-green px-1.5 text-[10px] font-bold text-white">{unread}</span>}
            </Link>
            <span className="hidden text-muted sm:inline">{profile?.full_name ?? user.email}</span>
            <form action={signOutAction}><button className="rounded-lg px-3 py-1.5 font-medium text-navy-900 hover:bg-navy-50">Sair</button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <PanelNav />
        <main id="conteudo" className="min-w-0">{children}</main>
      </div>
      {profile && <RealtimeListener userId={user.id} />}
    </div>
  );
}
