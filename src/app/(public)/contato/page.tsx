import type { Metadata } from 'next';
import { JsonForm } from '@/components/json-form';
import { Card } from '@/components/ui';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { title: 'Contato', alternates: { canonical: '/contato' } };

export default function ContatoPage() {
  return (
    <div className="container-page grid max-w-5xl gap-10 py-12 md:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Contato</h1>
        <p className="mt-3 text-muted">Dúvidas sobre a plataforma, parcerias de conteúdo ou suporte a consultores.</p>
        <Card className="mt-8 p-6">
          <JsonForm action="/api/contact" submitLabel="Enviar mensagem" successTitle="Mensagem recebida">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-name" className="field-label">Nome</label>
                <input id="c-name" name="name" required className="field-input" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="c-email" className="field-label">E-mail</label>
                <input id="c-email" name="email" type="email" required className="field-input" autoComplete="email" />
              </div>
            </div>
            <div>
              <label htmlFor="c-subject" className="field-label">Assunto</label>
              <input id="c-subject" name="subject" required minLength={3} maxLength={160} className="field-input" />
            </div>
            <div>
              <label htmlFor="c-message" className="field-label">Mensagem</label>
              <textarea id="c-message" name="message" required minLength={5} maxLength={5000} rows={6} className="field-input" />
            </div>
            <p className="text-xs text-muted">Usaremos seus dados apenas para responder a esta mensagem.</p>
          </JsonForm>
        </Card>
      </div>
      <aside className="space-y-4 md:pt-24">
        <Card className="p-5 text-sm">
          <p className="font-bold text-navy-900">E-mail</p>
          <p className="mt-1 text-muted">{siteConfig.company.contactEmail}</p>
          <p className="mt-4 font-bold text-navy-900">Privacidade (encarregado)</p>
          <p className="mt-1 text-muted">{siteConfig.company.dpoEmail}</p>
        </Card>
      </aside>
    </div>
  );
}
