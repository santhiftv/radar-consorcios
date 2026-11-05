import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="conteudo" className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-green-dark">Erro 404</p>
      <h1 className="mt-2 text-3xl font-extrabold">Página não encontrada</h1>
      <p className="mt-3 text-muted">O endereço pode ter mudado ou o conteúdo foi removido.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-lg bg-navy-900 px-5 py-2.5 font-semibold text-white">Ir para o início</Link>
        <Link href="/blog" className="rounded-lg border border-line px-5 py-2.5 font-semibold text-navy-900">Ver o blog</Link>
      </div>
    </main>
  );
}
