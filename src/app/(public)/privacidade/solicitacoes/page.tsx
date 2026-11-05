import type { Metadata } from 'next';
import { JsonForm } from '@/components/json-form';
import { Card } from '@/components/ui';
import { PRIVACY_REQUEST_TYPES } from '@/lib/services/privacy';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacidade e meus dados',
  description: 'Revogue o compartilhamento, interrompa comunicações ou solicite acesso, correção e exclusão dos seus dados.',
  alternates: { canonical: '/privacidade/solicitacoes' },
};

export default function SolicitacoesPage() {
  return (
    <div className="container-page grid max-w-5xl gap-10 py-12 md:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Privacidade e meus dados</h1>
        <p className="mt-3 text-muted">
          Escolha o que deseja fazer. Para sua segurança, enviaremos um link de confirmação ao e-mail informado — a solicitação só é processada após a confirmação.
        </p>
        <Card className="mt-8 p-6">
          <JsonForm action="/api/privacy/requests" submitLabel="Enviar solicitação" successTitle="Verifique seu e-mail">
            <fieldset>
              <legend className="field-label">O que você deseja?</legend>
              <div className="space-y-2">
                {Object.entries(PRIVACY_REQUEST_TYPES).map(([value, label], i) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-navy-900 has-[:checked]:bg-navy-50">
                    <input type="radio" name="type" value={value} defaultChecked={i === 4} className="accent-navy-900" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="p-email" className="field-label">E-mail usado no pedido de propostas</label>
              <input id="p-email" name="email" type="email" required className="field-input" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="p-details" className="field-label">Detalhes <span className="font-normal text-muted">(opcional — ex.: dado a corrigir)</span></label>
              <textarea id="p-details" name="details" rows={4} maxLength={2000} className="field-input" />
            </div>
          </JsonForm>
        </Card>
      </div>
      <aside className="space-y-4 md:pt-24">
        <Card className="p-5 text-sm text-navy-900">
          <p className="font-bold">Prazos</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>Revogação de compartilhamento e interrupção de comunicações: automáticas após a confirmação.</li>
            <li>Acesso, correção e exclusão: analisados pela equipe em até 15 dias.</li>
          </ul>
          <p className="mt-4 font-bold">Encarregado de dados</p>
          <p className="mt-1 text-muted">{siteConfig.company.dpoEmail}</p>
        </Card>
      </aside>
    </div>
  );
}
