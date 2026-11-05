import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { cookiePolicy } from '@/content/legal';

export const metadata: Metadata = { title: 'Política de Cookies', alternates: { canonical: '/cookies' } };

export default function CookiesPage() {
  return <LegalPage title="Política de Cookies" updatedAt={cookiePolicy.updatedAt} sections={cookiePolicy.sections} />;
}
