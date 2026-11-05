'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Toast {
  id: string;
  title: string;
  body: string;
}

/**
 * Escuta canais PRIVADOS do Supabase Realtime (autorizados por RLS em
 * realtime.messages): o tópico pessoal do consultor e o feed sem dados
 * pessoais. Também faz atualização periódica como redundância.
 */
export function RealtimeListener({ userId, pollSeconds = 60 }: { userId: string; pollSeconds?: number }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    (async () => {
      await supabase.realtime.setAuth();
      if (!active) return;
      const personal = supabase
        .channel(`consultant:${userId}`, { config: { private: true } })
        .on('broadcast', { event: 'notification' }, ({ payload }) => {
          const p = payload as { id: string; title: string; body: string };
          setToasts((t) => [...t.slice(-2), { id: p.id, title: p.title, body: p.body }]);
          router.refresh();
        })
        .subscribe();
      const feed = supabase
        .channel('leads-feed', { config: { private: true } })
        .on('broadcast', { event: 'lead_taken' }, () => router.refresh())
        .on('broadcast', { event: 'lead_available' }, () => router.refresh())
        .subscribe();
      channels.push(personal, feed);
    })();

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, pollSeconds * 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [userId, pollSeconds, router]);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-xl border border-line bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-navy-900">{t.title}</p>
            <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} aria-label="Fechar" className="text-muted">×</button>
          </div>
          <p className="mt-1 text-sm text-muted">{t.body}</p>
        </div>
      ))}
    </div>
  );
}
