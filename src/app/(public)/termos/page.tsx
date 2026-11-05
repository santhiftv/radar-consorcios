import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { consultantTerms, termsOfUse } from '@/content/legal';

export const metadata: Metadata = { title: 'Termos de Uso', alternates: { canonical: '/termos' } };

export default function TermosPage() {
  return (
    <>
      <LegalPage title="Termos de Uso" updatedAt={termsOfUse.updatedAt} sections={termsOfUse.sections} />
      <div id="consultor" className="scroll-mt-20">
        <LegalPage title="Termos do Consultor" updatedAt={`versão ${consultantTerms.version}`} sections={consultantTerms.sections} />
      </div>
    </>
  );
}
