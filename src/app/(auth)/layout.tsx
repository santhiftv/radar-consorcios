import type { Metadata } from 'next';
import { Logo } from '@/components/site-header';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-navy-50">
      <header className="container-page flex h-16 items-center"><Logo /></header>
      <main id="conteudo" className="container-page flex justify-center py-10">
        <div className="card w-full max-w-md p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
