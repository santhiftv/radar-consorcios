'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';

type Choice = 'essential' | 'analytics';
const KEY = 'ci_cookie_choice_v1';

function read(): Choice | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'essential' || v === 'analytics' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Aviso de cookies com opção mais protetiva destacada. Ferramentas de análise
 * só são carregadas após autorização explícita.
 */
export function CookieConsent({ gaId }: { gaId?: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(read());
    setReady(true);
    const reopen = () => setChoice(null);
    window.addEventListener('ci:open-cookie-settings', reopen);
    return () => window.removeEventListener('ci:open-cookie-settings', reopen);
  }, []);

  const save = (c: Choice) => {
    try {
      window.localStorage.setItem(KEY, c);
    } catch {
      /* navegação privada */
    }
    setChoice(c);
  };

  return (
    <>
      {gaId && choice === 'analytics' && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)},{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
        </>
      )}
      {ready && choice === null && (
        <div role="dialog" aria-live="polite" aria-label="Preferências de cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-line bg-white p-4 shadow-2xl sm:p-5">
          <p className="text-sm text-ink">
            Usamos cookies essenciais para o site funcionar. Com sua permissão, também usamos cookies analíticos para entender o uso do site de forma agregada.{' '}
            <Link href="/cookies" className="font-medium text-navy-700 underline">
              Política de Cookies
            </Link>
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button onClick={() => save('essential')} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
              Somente essenciais
            </button>
            <button onClick={() => save('analytics')} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50">
              Aceitar analíticos
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function CookieSettingsLink() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event('ci:open-cookie-settings'))} className="hover:text-white">
      Preferências de cookies
    </button>
  );
}
