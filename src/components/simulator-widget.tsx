'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CREDIT_BANDS, INSTALLMENT_BANDS, bandForValue } from '@/lib/domain/bands';
import { formatBRL, parseBRLToCents } from '@/lib/domain/money';
import { GENERIC_SCENARIOS, simulate, type ScenarioAssumption, type SimulationResult } from '@/lib/domain/simulator';
import { UFS, normalizePhoneBR } from '@/lib/domain/validation';
import { privacyNotice } from '@/content/legal';
import { siteConfig } from '@/config/site';
import { UrgencyScale } from './urgency-scale';

interface Props {
  modalities: Array<{ id: string; name: string }>;
  leadForm: { administrators: Array<{ id: string; name: string }>; turnstileSiteKey?: string };
  compact?: boolean;
  initialModality?: string;
}

const TERM_HINT: Record<string, number> = { veiculos: 80, imoveis: 200, servicos: 36, outros: 60 };

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; duplicate: boolean };

/**
 * Simulador em 2 etapas curtas. O resultado só aparece depois do cadastro com
 * telefone, e-mail e autorização expressa de contato (enviado a /api/leads).
 *  1) objetivo, valor da carta e WhatsApp
 *  2) nome, e-mail, cidade/UF, urgência e autorização
 */
export function SimulatorWidget({ modalities, leadForm, compact = false, initialModality }: Props) {
  const startModality = modalities.find((m) => m.id === initialModality)?.id ?? modalities[0]?.id ?? 'imoveis';
  const [modality, setModality] = useState(startModality);
  const [credit, setCredit] = useState(startModality === 'veiculos' ? '80.000' : startModality === 'servicos' ? '20.000' : '200.000');
  const [term, setTerm] = useState(String(TERM_HINT[startModality] ?? 120));
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [installmentBand, setInstallmentBand] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioAssumption[]>(GENERIC_SCENARIOS.map((s) => ({ ...s })));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const startedAt = useRef(0);
  const step2Ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (step === 2) step2Ref.current?.focus();
  }, [step]);

  const band = INSTALLMENT_BANDS.find((b) => b.id === installmentBand);
  const registered = status.kind === 'done';

  function compute() {
    return simulate({
      creditCents: parseBRLToCents(credit) ?? 0,
      termMonths: Number(term),
      desiredInstallmentMinCents: band?.minCents ?? null,
      desiredInstallmentMaxCents: band?.maxCents ?? null,
      scenarios,
    });
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    const r = compute();
    const errs: Record<string, string> = r.ok ? {} : { ...r.errors };
    if (!normalizePhoneBR(phone)) errs.phone = 'Informe um celular válido com DDD.';
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  }

  function recalc(e: React.FormEvent) {
    e.preventDefault();
    const r = compute();
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setResult(r);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = compute();
    if (!r.ok) {
      setErrors(r.errors);
      setStep(1);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams(window.location.search);
    const payload: Record<string, unknown> = {
      fullName: fd.get('fullName'),
      email: fd.get('email'),
      phone,
      city: fd.get('city'),
      state: fd.get('state'),
      modality,
      creditBand: bandForValue(CREDIT_BANDS, r.creditCents)?.id ?? '',
      installmentBand: installmentBand || bandForValue(INSTALLMENT_BANDS, r.scenarios[1]?.monthlyCents ?? 0)?.id || '',
      termMonths: r.termMonths,
      preferredChannel: 'whatsapp',
      urgency: fd.get('urgency'),
      consentShare: fd.get('consentShare') === 'on',
      consentMarketing: false,
      noticeVersion: privacyNotice.version,
      website: fd.get('website'),
      startedAt: startedAt.current,
      source: 'simulator',
      sourcePath: window.location.pathname,
      captchaToken: fd.get('cf-turnstile-response') ?? null,
      utm: Object.fromEntries([...params.entries()].filter(([k]) => k.startsWith('utm_'))),
    };

    setStatus({ kind: 'sending' });
    setErrors({});
    try {
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = (await res.json().catch(() => ({}))) as { status?: string; error?: string; fields?: Record<string, string> };
      if (res.ok) {
        setResult(r);
        setStatus({ kind: 'done', duplicate: body.status === 'duplicate' });
        return;
      }
      if (body.fields) {
        setErrors(body.fields);
        if (body.fields.phone || body.fields.creditBand) setStep(1);
      }
      setStatus({ kind: 'error', message: body.error ?? 'Não foi possível enviar. Tente novamente.' });
    } catch {
      setStatus({ kind: 'error', message: 'Falha de conexão. Verifique sua internet e tente novamente.' });
    }
  }

  const maxMonthly = useMemo(() => (result ? Math.max(...result.scenarios.map((s) => s.monthlyCents)) : 0), [result]);
  const err = (k: string) => errors[k];
  const aria = (k: string) => ({ 'aria-invalid': !!err(k), 'aria-describedby': err(k) ? `sim-${k}-error` : undefined });

  const progress = (
    <ol className="mt-4 flex items-center gap-2 text-xs font-semibold" aria-label="Etapas">
      {['Sua carta', 'Seus dados', 'Simulação'].map((label, i) => {
        const n = i + 1;
        const current = registered ? 3 : step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={`grid h-6 w-6 place-items-center rounded-full ${n <= current ? 'bg-navy-900 text-white' : 'bg-navy-50 text-muted'}`} aria-current={n === current ? 'step' : undefined}>
              {n}
            </span>
            <span className={n <= current ? 'text-navy-900' : 'text-muted'}>{label}</span>
            {n < 3 && <span aria-hidden className="mx-1 h-px w-5 bg-line" />}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={compact ? '' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'}>
      <div className="card p-5 sm:p-6">
        <h2 className="text-xl font-bold">Simule seu consórcio</h2>
        <p className="mt-1 text-sm text-muted">Gratuito e rápido. Estimativa ilustrativa — não é proposta.</p>
        {progress}

        {registered ? (
          <form onSubmit={recalc} noValidate className="mt-5 space-y-4">
            <p className="text-sm font-semibold text-navy-900">Ajuste e recalcule quantas vezes quiser</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sim-credit" className="field-label">Valor da carta</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
                  <input id="sim-credit" inputMode="decimal" className="field-input pl-9" value={credit} onChange={(e) => setCredit(e.target.value)} aria-invalid={!!errors.creditCents} />
                </div>
                {errors.creditCents && <p className="field-error">{errors.creditCents}</p>}
              </div>
              <div>
                <label htmlFor="sim-term" className="field-label">Prazo (meses)</label>
                <input id="sim-term" type="number" min={6} max={240} className="field-input" value={term} onChange={(e) => setTerm(e.target.value)} aria-invalid={!!errors.termMonths} />
                {errors.termMonths && <p className="field-error">{errors.termMonths}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="sim-installment" className="field-label">Parcela que cabe no bolso</label>
                <select id="sim-installment" className="field-input" value={installmentBand} onChange={(e) => setInstallmentBand(e.target.value)}>
                  <option value="">Não sei / sem preferência</option>
                  {INSTALLMENT_BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
            </div>
            <button type="button" onClick={() => setShowAdjust((v) => !v)} className="text-sm font-medium text-navy-700 underline">
              {showAdjust ? 'Ocultar' : 'Ajustar'} premissas dos cenários
            </button>
            {showAdjust && (
              <div className="space-y-2 rounded-lg bg-navy-50 p-3 text-sm">
                <p className="text-muted">Parâmetros hipotéticos (não são taxas de nenhuma administradora).</p>
                {scenarios.map((s, i) => (
                  <div key={s.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <span className="truncate">{s.label.replace('Cenário hipotético ', '')}</span>
                    <label className="flex items-center gap-1">
                      <span className="sr-only">Taxa de administração total (%)</span>
                      <input type="number" step="0.5" min={0} max={60} value={s.adminFeeTotalPct} className="field-input w-20 py-1"
                        onChange={(e) => setScenarios((prev) => prev.map((p, j) => (j === i ? { ...p, adminFeeTotalPct: Number(e.target.value) } : p)))} />
                      <span className="text-xs text-muted">% adm.</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="sr-only">Fundo de reserva (%)</span>
                      <input type="number" step="0.5" min={0} max={20} value={s.reserveFundPct} className="field-input w-16 py-1"
                        onChange={(e) => setScenarios((prev) => prev.map((p, j) => (j === i ? { ...p, reserveFundPct: Number(e.target.value) } : p)))} />
                      <span className="text-xs text-muted">% FR</span>
                    </label>
                  </div>
                ))}
                {errors.scenarios && <p className="field-error">{errors.scenarios}</p>}
              </div>
            )}
            <button type="submit" className="w-full rounded-lg bg-brand-green px-4 py-3 font-semibold text-white hover:bg-brand-green-dark">Recalcular</button>
          </form>
        ) : step === 1 ? (
          <form onSubmit={next} noValidate className="mt-5 space-y-4">
            <fieldset>
              <legend className="field-label">O que você quer conquistar?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {modalities.map((m) => (
                  <label key={m.id} className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition ${modality === m.id ? 'border-navy-900 bg-navy-900 text-white' : 'border-line hover:border-navy-700'}`}>
                    <input
                      type="radio"
                      name="modality"
                      value={m.id}
                      checked={modality === m.id}
                      onChange={() => {
                        setModality(m.id);
                        setTerm(String(TERM_HINT[m.id] ?? 120));
                      }}
                      className="sr-only"
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="sim-credit" className="field-label">Valor da carta de crédito</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
                <input id="sim-credit" inputMode="decimal" className="field-input pl-9" value={credit} onChange={(e) => setCredit(e.target.value)} aria-invalid={!!errors.creditCents} />
              </div>
              {errors.creditCents && <p className="field-error">{errors.creditCents}</p>}
            </div>
            <div>
              <label htmlFor="sim-phone" className="field-label">Seu WhatsApp</label>
              <input id="sim-phone" name="phone" type="tel" inputMode="tel" placeholder="(41) 99999-0000" className="field-input" autoComplete="tel-national" required value={phone} onChange={(e) => setPhone(e.target.value)} {...aria('phone')} />
              {err('phone') && <p id="sim-phone-error" className="field-error">{err('phone')}</p>}
            </div>
            <button type="submit" className="w-full rounded-lg bg-brand-green px-4 py-3 font-semibold text-white hover:bg-brand-green-dark">Continuar</button>
          </form>
        ) : (
          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            {/* honeypot: invisível para pessoas */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="sim-website">Site</label>
              <input id="sim-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="sim-fullName" className="field-label">Nome</label>
                <input ref={step2Ref} id="sim-fullName" name="fullName" className="field-input" autoComplete="name" required {...aria('fullName')} />
                {err('fullName') && <p id="sim-fullName-error" className="field-error">{err('fullName')}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="sim-email" className="field-label">E-mail</label>
                <input id="sim-email" name="email" type="email" className="field-input" autoComplete="email" required {...aria('email')} />
                {err('email') && <p id="sim-email-error" className="field-error">{err('email')}</p>}
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-3 sm:col-span-2">
                <div>
                  <label htmlFor="sim-city" className="field-label">Cidade</label>
                  <input id="sim-city" name="city" className="field-input" autoComplete="address-level2" required {...aria('city')} />
                </div>
                <div>
                  <label htmlFor="sim-state" className="field-label">UF</label>
                  <select id="sim-state" name="state" defaultValue="" className="field-input" required {...aria('state')}>
                    <option value="">—</option>
                    {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                {(err('city') || err('state')) && <p className="field-error col-span-2">{err('city') ?? err('state')}</p>}
              </div>
              <UrgencyScale error={err('urgency')} idPrefix="sim-urg" />
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

            {leadForm.turnstileSiteKey && (
              <>
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                <div className="cf-turnstile" data-sitekey={leadForm.turnstileSiteKey} data-language="pt-br" />
              </>
            )}

            {status.kind === 'error' && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{status.message}</p>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-line px-4 py-3 text-sm font-semibold text-navy-900 hover:bg-navy-50">
                Voltar
              </button>
              <button
                type="submit"
                disabled={status.kind === 'sending'}
                className="flex-1 rounded-lg bg-brand-green px-4 py-3 font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60"
              >
                {status.kind === 'sending' ? 'Enviando…' : 'Ver minha simulação'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-4" aria-live="polite">
        {!result ? (
          <div className="card flex h-full min-h-64 flex-col justify-center p-6 text-center">
            <p className="font-display text-lg font-bold text-navy-900">Seu resultado aparece aqui</p>
            <p className="mt-2 text-sm text-muted">
              Em dois passos rápidos você vê três cenários de parcela para a sua carta — e um consultor da sua região pode apresentar condições reais.
            </p>
          </div>
        ) : (
          <>
            {status.kind === 'done' && (
              <div role="status" className="rounded-xl border border-brand-green/30 bg-brand-green-soft p-4 text-sm text-navy-900">
                <p className="font-semibold">{status.duplicate ? 'Já tínhamos seu pedido — aqui está sua simulação.' : 'Pronto! Aqui está sua simulação.'}</p>
                <p className="mt-1">Um consultor da sua região poderá chamar você no WhatsApp com propostas reais.</p>
              </div>
            )}
            <div className="card p-5 sm:p-6">
              <p className="text-sm text-muted">
                Carta de <strong className="text-navy-900">{formatBRL(result.creditCents, { cents: false })}</strong> em{' '}
                <strong className="text-navy-900">{result.termMonths} meses</strong>
              </p>
              <ul className="mt-4 space-y-4">
                {result.scenarios.map((s) => (
                  <li key={s.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-navy-900">{s.label}</span>
                      <span className="font-display text-xl font-bold text-navy-900">{formatBRL(s.monthlyCents)}<span className="text-sm font-medium text-muted">/mês</span></span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-navy-50" aria-hidden>
                      <div className="h-2.5 rounded-full bg-gradient-to-r from-navy-800 to-brand-green" style={{ width: `${Math.max(8, (s.monthlyCents / maxMonthly) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Premissas: {s.adminFeeTotalPct}% de taxa de administração total e {s.reserveFundPct}% de fundo de reserva · Total estimado {formatBRL(s.totalPaidCents, { cents: false })}
                      {s.fitsDesiredRange === true && <span className="ml-1 font-semibold text-brand-green-dark">· dentro da faixa desejada</span>}
                    </p>
                  </li>
                ))}
              </ul>
              {result.creditForDesiredInstallment && band && (
                <p className="mt-4 rounded-lg bg-brand-green-soft px-3 py-2 text-sm text-navy-900">
                  Com parcela de até {formatBRL(band.maxCents ?? 0, { cents: false })}, a carta ilustrativa ficaria entre{' '}
                  <strong>{formatBRL(Math.min(...result.creditForDesiredInstallment.map((c) => c.creditCents)), { cents: false })}</strong> e{' '}
                  <strong>{formatBRL(Math.max(...result.creditForDesiredInstallment.map((c) => c.creditCents)), { cents: false })}</strong> nesse prazo.
                </p>
              )}
              <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted">
                {result.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
              <p className="mt-3 text-xs text-muted">{siteConfig.disclaimers.simulation}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
