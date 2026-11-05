import type { Metadata } from 'next';
import Link from 'next/link';
import { signOutAction } from '@/app/(auth)/actions';
import { TabNav } from '@/components/panel/panel-nav';
import { Logo } from '@/components/site-header';
import { requireAdmin } from '@/lib/auth/guards';
import { ADMIN_TABS, roleHas } from '@/lib/auth/permissions';

export const metadata: Metadata = { title: 'Administração', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const ROLE_LABEL = { owner: 'Proprietário', admin: 'Administrador', editor: 'Editor', support: 'Suporte', finance: 'Financeiro' } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdmin('dashboard');
  const tabs = ADMIN_TABS.filter((t) => roleHas(role, t.permission));
  return (
    <div className="min-h-dvh bg-navy-50">
      <header className="border-b border-navy-800 bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3"><Logo light /><span className="rounded bg-white/10 px-2 py-0.5 text-xs">Admin</span></div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-navy-100 sm:inline">{user.email} · {ROLE_LABEL[role]}</span>
            <Link href="/painel" className="rounded-lg px-3 py-1.5 hover:bg-white/10">Painel</Link>
            <form action={signOutAction}><button className="rounded-lg px-3 py-1.5 hover:bg-white/10">Sair</button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <TabNav tabs={tabs} base="/admin" />
        <main id="conteudo" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
