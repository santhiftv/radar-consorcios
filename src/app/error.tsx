'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Integre aqui o serviço de monitoramento (ex.: Sentry) se configurado.
    console.error('ui_error', { digest: error.digest });
  }, [error]);
  return (
    <main id="conteudo" className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-3xl font-extrabold">Algo deu errado</h1>
      <p className="mt-3 text-muted">Tente novamente. Se o problema persistir, fale com o suporte.</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Código: {error.digest}</p>}
      <button onClick={reset} className="mt-6 rounded-lg bg-navy-900 px-5 py-2.5 font-semibold text-white">Tentar novamente</button>
    </main>
  );
}
