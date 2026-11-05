import type { LegalSection } from '@/content/legal';

export function LegalPage({ title, updatedAt, intro, sections }: { title: string; updatedAt?: string; intro?: string; sections: LegalSection[] }) {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {updatedAt && <p className="mt-2 text-sm text-muted">Última atualização: {updatedAt}</p>}
      <p className="mt-4 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-navy-900">
        Documento em versão preliminar, sujeito a revisão jurídica antes do lançamento.
      </p>
      {intro && <p className="mt-6 text-lg text-muted">{intro}</p>}
      <div className="prose-article mt-6">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
          </section>
        ))}
      </div>
    </div>
  );
}
