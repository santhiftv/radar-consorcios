import { saveSettingAction } from '../actions';
import { ActionForm } from '@/components/panel/action-form';
import { Alert, Badge, Card, PageTitle } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { PRIVACY_NOTICE_VERSION } from '@/content/legal';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/server/deps';
import { integrationStatus } from '@/lib/server/env';

export default async function AdminConfiguracoesPage() {
  await requireAdmin('settings');
  const { data } = await createAdminClient().from('app_settings').select('key, value, description, is_public, updated_at').order('key');
  const settings = (data ?? []) as Array<{ key: string; value: unknown; description: string | null; is_public: boolean }>;
  const dbNotice = settings.find((s) => s.key === 'privacy_notice_version')?.value;
  return (
    <>
      <PageTitle title="Configurações" description="Regras operacionais editáveis. Cada alteração é auditada." />
      {dbNotice !== PRIVACY_NOTICE_VERSION && (
        <Alert tone="danger" className="mb-4">
          A versão do aviso de privacidade no banco ({String(dbNotice)}) difere da versão exibida no site ({PRIVACY_NOTICE_VERSION}). Novos pedidos serão recusados até alinhar as duas.
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {settings.map((s) => (
            <Card key={s.key} className="p-4">
              <ActionForm action={saveSettingAction} submitLabel="Salvar" submitVariant="secondary" className="grid gap-2 md:grid-cols-[260px_1fr_auto] md:items-start">
                <input type="hidden" name="key" value={s.key} />
                <div>
                  <p className="font-mono text-sm font-semibold">{s.key} {s.is_public && <Badge>público</Badge>}</p>
                  <p className="text-xs text-muted">{s.description}</p>
                </div>
                <textarea name="value" rows={JSON.stringify(s.value).length > 60 ? 4 : 1} defaultValue={JSON.stringify(s.value)} className="field-input font-mono text-xs" />
              </ActionForm>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-bold">Integrações</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {integrationStatus().map((i) => (
                <li key={i.name} className="flex items-center justify-between gap-2">{i.name}<Badge tone={i.ok ? 'green' : i.optional ? 'neutral' : 'danger'}>{i.ok ? 'ok' : i.optional ? 'opcional' : 'pendente'}</Badge></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Valores secretos nunca são exibidos. Configure-os nas variáveis de ambiente da hospedagem.</p>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="font-bold">Identidade</h2>
            <p className="mt-2">Nome: {siteConfig.name}</p>
            <p>Domínio: {siteConfig.url}</p>
            <p>Empresa: {siteConfig.company.legalName} · {siteConfig.company.cnpj}</p>
            <p className="mt-2 text-xs text-muted">Nome, cores, logotipo e textos institucionais ficam em src/config/site.ts e nas variáveis NEXT_PUBLIC_*.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
