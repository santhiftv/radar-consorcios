import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { privacyNotice, privacyPolicy } from '@/content/legal';

export const metadata: Metadata = { title: 'Política de Privacidade', alternates: { canonical: '/privacidade' } };

export default function PrivacidadePage() {
  return (
    <>
      <section id="aviso" className="container-page max-w-3xl scroll-mt-24 pt-12">
        <div className="rounded-2xl border border-line bg-navy-50 p-5 sm:p-6">
          <h2 className="text-xl font-bold">{privacyNotice.title}</h2>
          <p className="mt-1 text-sm text-muted">Resumo dos termos aceitos ao pedir propostas ou simular · versão {privacyNotice.version}</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-navy-900">
            {privacyNotice.items.map((i) => <li key={i}>{i}</li>)}
          </ul>
          <p className="mt-3 text-sm text-navy-900"><strong>Autorização:</strong> {privacyNotice.shareLabel}</p>
        </div>
      </section>
      <LegalPage title="Política de Privacidade" updatedAt={privacyPolicy.updatedAt} sections={privacyPolicy.sections} />
      <div className="container-page max-w-3xl">
        <Link href="/privacidade/solicitacoes" className="inline-block rounded-lg bg-navy-900 px-5 py-3 font-semibold text-white">Exercer meus direitos</Link>
      </div>
    </>
  );
}
