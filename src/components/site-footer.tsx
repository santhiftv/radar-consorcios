import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { CookieSettingsLink } from './cookie-consent';
import { Logo } from './site-header';

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-navy-950 text-navy-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-navy-100/80">{siteConfig.disclaimers.independence}</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-navy-100/80">{siteConfig.disclaimers.contemplation}</p>
        </div>
        <nav aria-label="Plataforma" className="text-sm">
          <p className="mb-3 font-semibold text-white">Plataforma</p>
          <ul className="space-y-2 text-navy-100/80">
            <li><Link href="/simulador" className="hover:text-white">Simulador</Link></li>
            <li><Link href="/solicitar-proposta" className="hover:text-white">Solicitar propostas</Link></li>
            <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
            <li><Link href="/como-funciona" className="hover:text-white">Como funciona</Link></li>
            <li><Link href="/sobre" className="hover:text-white">Sobre</Link></li>
            <li><Link href="/planos" className="hover:text-white">Planos para consultores</Link></li>
            <li><Link href="/contato" className="hover:text-white">Contato</Link></li>
          </ul>
        </nav>
        <nav aria-label="Privacidade e termos" className="text-sm">
          <p className="mb-3 font-semibold text-white">Privacidade</p>
          <ul className="space-y-2 text-navy-100/80">
            <li><Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link></li>
            <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
            <li><Link href="/cookies" className="hover:text-white">Política de Cookies</Link></li>
            <li><Link href="/privacidade/solicitacoes" className="hover:text-white">Privacidade e meus dados</Link></li>
            <li><CookieSettingsLink /></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-navy-100/60 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.company.legalName} · CNPJ {siteConfig.company.cnpj}
          </p>
          <p>Encarregado de dados: {siteConfig.company.dpoEmail}</p>
        </div>
      </div>
    </footer>
  );
}
