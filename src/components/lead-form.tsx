'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { CREDIT_BANDS, INSTALLMENT_BANDS, TERM_OPTIONS } from '@/lib/domain/bands';
import { UFS } from '@/lib/domain/validation';
import { privacyNotice } from '@/content/legal';
import { UrgencyScale } from './urgency-scale';

export interface LeadFormProps {
  modalities: Array<{ id: string; name: string }>;
  administrators: Array<{ id: string; name: string }>;
  source: 'simulator' | 'form' | 'blog' | 'home';
  defaults?: Partial<Record<'modality' | 'creditBand' | 'installmentBand' | 'termMonths' | 'city' | 'state' | 'neighborhood', string>>;
  turnstileSiteKey?: string;
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; duplicate: boolean; message: string } | { kind: 'error'; message: string };

export function LeadForm({ modalities, administrators, source, defaults, turnstileSiteKey }: LeadFormProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const startedAt = useRef<number>(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    payload.consentShare = fd.get('consentShare') === 'on';
    payload.consentMarketing = fd.get('consentMarketing') === 'on';
    payload.startedAt = startedAt.current;
    payload.source = source;
    payload.sourcePath = window.location.pathname;
    payload.captchaToken = fd.get('cf-turnstile-response') ?? null;
    const params = new URLSearchParams(window.location.search);
    payload.utm = Object.fromEntries([...params.entries()].filter(([k]) => k.startsWith('utm_')));

    setStatus({ kind: 'sending' });
    setErrors({});
    try {
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string; error?: string; fields?: Record<string, string> };
      if (res.ok) {
        setStatus({ kind: 'done', duplicate: body.status === 'duplicate', message: body.message ?? 'Solicitação registrada.' });
        return;
      }
      if (body.fields) setErrors(body.fields);
      setStatus({ kind: 'error', message: body.error ?? 'Não foi possível enviar. Tente novamente.' });
    } catch {
      setStatus({ kind: 'error', message: 'Falha de conexão. Verifique sua internet e tente novamente.' });
    }
  }

  if (status.kind === 'done') {
    return (
      <div role="status" className="rounded-xl border border-brand-green/30 bg-brand-green-soft p-5">
        <p className="font-display text-lg font-bold text-navy-900">{status.duplicate ? 'Já recebemos seu pedido' : 'Pedido recebido!'}</p>
        <p className="mt-2 text-sm text-navy-900">{status.message}</p>
        <p className="mt-2 text-sm text-navy-900">
          Um consultor compatível poderá entrar em contato pelo canal escolhido. Você pode interromper o compartilhamento a qualquer momento em{' '}
          <Link href="/privacidade/solicitacoes" className="font-semibold underline">Privacidade e meus dados</Link>.
        </p>
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const inputProps = (k: string) => ({ 'aria-invalid': !!err(k), 'aria-describedby': err(k) ? `${k}-error` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {/* honeypot: invisível para pessoas */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Site</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="noticeVersion" value={privacyNotice.version} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="fullName" className="field-label">Nome</label>
          <input id="fullName" name="fullName" className="field-input" autoComplete="name" required {...inputProps('fullName')} />
          {err('fullName') && <p id="fullName-error" className="field-error">{err('fullName')}</p>}
        </div>
        <div>
          <label htmlFor="email" className="field-label">E-mail</label>
          <input id="email" name="email" type="email" className="field-input" autoComplete="email" required {...inputProps('email')} />
          {err('email') && <p id="email-error" className="field-error">{err('email')}</p>}
        </div>
        <div>
          <label htmlFor="phone" className="field-label">Telefone com DDD</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="(41) 99999-0000" className="field-input" autoComplete="tel-national" required {...inputProps('phone')} />
          {err('phone') && <p id="phone-error" className="field-error">{err('phone')}</p>}
        </div>
        <div>
          <label htmlFor="city" className="field-label">Cidade</label>
          <input id="city" name="city" defaultValue={defaults?.city} className="field-input" autoComplete="address-level2" required {...inputProps('city')} />
          {err('city') && <p id="city-error" className="field-error">{err('city')}</p>}
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-3">
          <div>
            <label htmlFor="state" className="field-label">UF</label>
            <select id="state" name="state" defaultValue={defaults?.state ?? ''} className="field-input" required {...inputProps('state')}>
              <option value="">—</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="neighborhood" className="field-label">Bairro <span className="font-normal text-muted">(opcional)</span></label>
            <input id="neighborhood" name="neighborhood" defaultValue={defaults?.neighborhood} className="field-input" />
          </div>
          {err('state') && <p id="state-error" className="field-error col-span-2">{err('state')}</p>}
        </div>
        <div>
          <label htmlFor="modality" className="field-label">Modalidade de interesse</label>
          <select id="modality" name="modality" defaultValue={defaults?.modality ?? ''} className="field-input" required {...inputProps('modality')}>
            <option value="">Selecione</option>
            {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {err('modality') && <p id="modality-error" className="field-error">{err('modality')}</p>}
        </div>
        <div>
          <label htmlFor="creditBand" className="field-label">Faixa de crédito</label>
          <select id="creditBand" name="creditBand" defaultValue={defaults?.creditBand ?? ''} className="field-input" required {...inputProps('creditBand')}>
            <option value="">Selecione</option>
            {CREDIT_BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          {err('creditBand') && <p id="creditBand-error" className="field-error">{err('creditBand')}</p>}
        </div>
        <div>
          <label htmlFor="installmentBand" className="field-label">Faixa de parcela</label>
          <select id="installmentBand" name="installmentBand" defaultValue={defaults?.installmentBand ?? ''} className="field-input" required {...inputProps('installmentBand')}>
            <option value="">Selecione</option>
            {INSTALLMENT_BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          {err('installmentBand') && <p id="installmentBand-error" className="field-error">{err('installmentBand')}</p>}
        </div>
        <div>
          <label htmlFor="termMonths" className="field-label">Prazo pretendido</label>
          <select id="termMonths" name="termMonths" defaultValue={defaults?.termMonths ?? ''} className="field-input" required {...inputProps('termMonths')}>
            <option value="">Selecione</option>
            {TERM_OPTIONS.map((t) => <option key={t} value={t}>{t} meses</option>)}
          </select>
          {err('termMonths') && <p id="termMonths-error" className="field-error">{err('termMonths')}</p>}
        </div>
        <div>
          <label htmlFor="bestContactTime" className="field-label">Melhor horário <span className="font-normal text-muted">(opcional)</span></label>
          <select id="bestContactTime" name="bestContactTime" defaultValue="" className="field-input">
            <option value="">Qualquer horário</option>
            <option value="Manhã (8h–12h)">Manhã (8h–12h)</option>
            <option value="Tarde (12h–18h)">Tarde (12h–18h)</option>
            <option value="Noite (18h–21h)">Noite (18h–21h)</option>
          </select>
        </div>
        <div>
          <label htmlFor="preferredAdministratorId" className="field-label">Preferência por administradora <span className="font-normal text-muted">(opcional)</span></label>
          <select id="preferredAdministratorId" name="preferredAdministratorId" defaultValue="" className="field-input">
            <option value="">Sem preferência</option>
            {administrators.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="field-label">Canal preferido de contato</legend>
          <div className="flex flex-wrap gap-2">
            {[
              ['whatsapp', 'WhatsApp'],
              ['phone', 'Ligação'],
              ['email', 'E-mail'],
            ].map(([v, l], i) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-navy-900 has-[:checked]:bg-navy-50">
                <input type="radio" name="preferredChannel" value={v} defaultChecked={i === 0} className="accent-navy-900" />
                {l}
              </label>
            ))}
          </div>
          {err('preferredChannel') && <p className="field-error">{err('preferredChannel')}</p>}
        </fieldset>
        <UrgencyScale error={err('urgency')} idPrefix="lf-urg" />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consentShare" className="mt-0.5 h-4 w-4 shrink-0 accent-brand-green" aria-invalid={!!err('consentShare')} />
        <span>
          Aceito os{' '}
          <Link href="/privacidade#aviso" target="_blank" className="font-semibold text-navy-700 underline">termos</Link>{' '}
          e autorizo o contato para receber propostas.
          <span className="mt-0.5 block text-xs text-muted">Até 2 consultores da sua região, um de cada vez. Você pode cancelar quando quiser.</span>
        </span>
      </label>
      {err('consentShare') && <p className="field-error">{err('consentShare')}</p>}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consentMarketing" className="mt-0.5 h-4 w-4 shrink-0 accent-brand-green" />
        <span>{privacyNotice.marketingLabel}</span>
      </label>

      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-language="pt-br" />
        </>
      )}

      {status.kind === 'error' && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{status.message}</p>
      )}

      <button type="submit" disabled={status.kind === 'sending'} className="w-full rounded-lg bg-brand-green px-4 py-3 font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60">
        {status.kind === 'sending' ? 'Enviando…' : 'Solicitar propostas'}
      </button>
      <p className="text-center text-xs text-muted">Gratuito para você. Sem garantia de contemplação ou de condições específicas.</p>
    </form>
  );
}
