import { Alert, Card, PageTitle, Stat } from '@/components/ui';
import { requireConsultant } from '@/lib/auth/guards';

interface Perf {
  claimed: number;
  contacted: number;
  converted: number;
  lost: number;
  expired: number;
  invalidated: number;
  avg_hours_to_contact: number | null;
  by_modality: Record<string, number>;
  attempts_lost: number;
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

export default async function DesempenhoPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias } = await searchParams;
  const days = [30, 90, 180].includes(Number(dias)) ? Number(dias) : 90;
  const { supabase } = await requireConsultant();
  const [{ data: perfData }, { data: usage }] = await Promise.all([
    supabase.rpc('consultant_performance', { p_days: days }),
    supabase.rpc('consultant_usage'),
  ]);
  const p = (perfData ?? {}) as Perf;
  const level = ((usage ?? {}) as { report_level?: string }).report_level ?? 'basic';
  const maxMod = Math.max(1, ...Object.values(p.by_modality ?? {}));

  return (
    <>
      <PageTitle
        title="Desempenho"
        description={`Últimos ${days} dias · relatórios ${level === 'advanced' ? 'avançados' : level === 'full' ? 'completos' : 'básicos'}. Resultados dependem dos status que você informa.`}
        actions={
          <form className="flex gap-2 text-sm">
            {[30, 90, 180].map((d) => (
              <button key={d} name="dias" value={d} className={`rounded-lg border px-3 py-1.5 ${d === days ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white'}`}>{d} dias</button>
            ))}
          </form>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Reivindicados" value={p.claimed ?? 0} />
        <Stat label="Contatados" value={p.contacted ?? 0} hint={`Taxa de contato ${pct(p.contacted ?? 0, p.claimed ?? 0)}`} />
        <Stat label="Vendas informadas" value={p.converted ?? 0} />
        <Stat label="Expirados sem contato" value={p.expired ?? 0} />
      </div>

      {level === 'basic' ? (
        <Alert tone="neutral" className="mt-6">Relatórios completos (por modalidade e tempo de contato) estão disponíveis no plano Profissional.</Alert>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-bold">Por modalidade</h2>
            <ul className="mt-4 space-y-3">
              {Object.entries(p.by_modality ?? {}).length === 0 && <li className="text-sm text-muted">Sem dados no período.</li>}
              {Object.entries(p.by_modality ?? {}).map(([k, v]) => (
                <li key={k}>
                  <div className="flex justify-between text-sm"><span className="capitalize">{k}</span><span className="font-semibold">{v}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-navy-50"><div className="h-2 rounded-full bg-navy-800" style={{ width: `${(v / maxMod) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Eficiência</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-muted">Tempo médio até contato</dt><dd className="text-xl font-bold">{p.avg_hours_to_contact != null ? `${p.avg_hours_to_contact} h` : '—'}</dd></div>
              <div><dt className="text-muted">Conversão informada</dt><dd className="text-xl font-bold">{pct(p.converted ?? 0, p.contacted ?? 0)}</dd></div>
              {level === 'advanced' && (
                <>
                  <div><dt className="text-muted">Disputas perdidas</dt><dd className="text-xl font-bold">{p.attempts_lost ?? 0}</dd></div>
                  <div><dt className="text-muted">Taxa de vitória</dt><dd className="text-xl font-bold">{pct(p.claimed ?? 0, (p.claimed ?? 0) + (p.attempts_lost ?? 0))}</dd></div>
                  <div><dt className="text-muted">Invalidados (contestação)</dt><dd className="text-xl font-bold">{p.invalidated ?? 0}</dd></div>
                  <div><dt className="text-muted">Sem negócio</dt><dd className="text-xl font-bold">{p.lost ?? 0}</dd></div>
                </>
              )}
            </dl>
          </Card>
        </div>
      )}
    </>
  );
}
