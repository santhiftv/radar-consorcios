import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { buttonClass } from './ui';

const NAV = [
  { href: '/simulador', label: 'Simulador' },
  { href: '/como-funciona', label: 'Como funciona' },
  { href: '/blog', label: 'Blog' },
  { href: '/perguntas-frequentes', label: 'Dúvidas' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${siteConfig.name} — início`}>
      <span aria-hidden className={`grid h-8 w-8 place-items-center rounded-lg ${light ? 'bg-white text-navy-900' : 'bg-navy-900 text-white'}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 17l5-5 4 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="7" r="1.6" fill="#1F9D6B" stroke="none" />
        </svg>
      </span>
      <span className={`font-display text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>
        {siteConfig.logo.text}
        <span className="text-brand-green">{siteConfig.logo.accent}</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/planos" className={buttonClass('secondary', 'sm')}>
            Sou consultor
          </Link>
          <Link href="/solicitar-proposta" className={buttonClass('primary', 'sm')}>
            Receber propostas
          </Link>
        </div>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-line px-3 py-2 text-sm font-semibold text-navy-900" aria-label="Abrir menu">
            Menu
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-xl">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
                {n.label}
              </Link>
            ))}
            <Link href="/planos" className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
              Sou consultor
            </Link>
            <Link href="/entrar" className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50">
              Entrar
            </Link>
            <Link href="/solicitar-proposta" className={buttonClass('primary', 'sm', 'mt-2 w-full')}>
              Receber propostas
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
