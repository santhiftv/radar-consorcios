'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const PANEL_TABS = [
  { href: '/painel', label: 'Visão geral' },
  { href: '/painel/novos-leads', label: 'Novos leads' },
  { href: '/painel/meus-leads', label: 'Meus leads' },
  { href: '/painel/historico', label: 'Histórico de reivindicações' },
  { href: '/painel/preferencias', label: 'Filtros e preferências' },
  { href: '/painel/desempenho', label: 'Desempenho' },
  { href: '/painel/assinatura', label: 'Plano e assinatura' },
  { href: '/painel/tokens', label: 'Tokens e saldo' },
  { href: '/painel/perfil', label: 'Perfil e segurança' },
  { href: '/painel/suporte', label: 'Suporte' },
];

export function TabNav({ tabs, base }: { tabs: Array<{ href: string; label: string }>; base: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Seções" className="lg:sticky lg:top-6 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {tabs.map((t) => {
          const active = t.href === base ? path === base : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-white'}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PanelNav() {
  return <TabNav tabs={PANEL_TABS} base="/painel" />;
}
