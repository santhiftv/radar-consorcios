'use client';

import { useEffect, useState } from 'react';

function b64urlToUint8(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const base64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = 'idle' | 'unsupported' | 'blocked' | 'enabled' | 'error';

export function EnablePushButton({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [state, setState] = useState<State>('idle');
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !vapidPublicKey) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') setState('blocked');
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (sub) setState('enabled');
      });
    }
  }, [vapidPublicKey]);

  async function enable() {
    try {
      setMsg('');
      if (!vapidPublicKey) return;
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'blocked' : 'idle');
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64urlToUint8(vapidPublicKey),
        });
      }
      const json = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('falha ao salvar');
      setState('enabled');
    } catch (e) {
      setState('error');
      setMsg((e as Error).message ?? 'erro desconhecido');
    }
  }

  async function disable() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
          credentials: 'same-origin',
        });
        await sub.unsubscribe();
      }
      setState('idle');
    } catch (e) {
      setMsg((e as Error).message ?? 'erro');
    }
  }

  if (state === 'unsupported') {
    return (
      <div className="rounded-xl border border-line bg-white p-4">
        <h3 className="font-semibold text-navy-900">Notificações no celular</h3>
        <p className="mt-1 text-sm text-muted">
          Este navegador não suporta notificações push. No iPhone, instale o site na tela inicial (botão Compartilhar →
          Adicionar à Tela de Início) e volte aqui para ativar.
        </p>
      </div>
    );
  }
  if (state === 'blocked') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-semibold text-navy-900">Notificações bloqueadas</h3>
        <p className="mt-1 text-sm text-navy-900">
          Você bloqueou as notificações. Para receber avisos de novos leads, libere nas configurações do navegador para
          este site.
        </p>
      </div>
    );
  }
  if (state === 'enabled') {
    return (
      <div className="rounded-xl border border-brand-green/30 bg-brand-green-soft p-4">
        <h3 className="font-semibold text-navy-900">🔔 Notificações ativas</h3>
        <p className="mt-1 text-sm text-navy-900">
          Avisaremos neste dispositivo quando chegar um novo lead compatível com seu perfil.
        </p>
        <button type="button" onClick={disable} className="mt-3 text-sm font-medium text-navy-900 underline">
          Desativar neste dispositivo
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="font-semibold text-navy-900">Receber alerta no celular quando chegar um novo lead</h3>
      <p className="mt-1 text-sm text-muted">
        Ativa notificações pop-up neste dispositivo. No iPhone, primeiro adicione o site à tela inicial.
      </p>
      <button
        type="button"
        onClick={enable}
        className="mt-3 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
      >
        Ativar notificações
      </button>
      {msg && <p className="mt-2 text-xs text-danger">{msg}</p>}
    </div>
  );
}
