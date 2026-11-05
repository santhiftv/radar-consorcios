/**
 * Escala 0–10 em que a própria pessoa informa a urgência para contratar.
 * Campo obrigatório (name="urgency"), sem valor pré-selecionado.
 */
export function UrgencyScale({ error, idPrefix = 'urg' }: { error?: string; idPrefix?: string }) {
  return (
    <fieldset className="sm:col-span-2" aria-describedby={error ? `${idPrefix}-error` : `${idPrefix}-hint`}>
      <legend className="field-label">De 0 a 10, qual a sua urgência para contratar?</legend>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <label
            key={n}
            className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-line text-sm font-semibold text-navy-900 transition has-[:checked]:border-navy-900 has-[:checked]:bg-navy-900 has-[:checked]:text-white has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-navy-100"
          >
            <input type="radio" name="urgency" value={n} required className="sr-only" aria-invalid={!!error} />
            {n}
          </label>
        ))}
      </div>
      <div id={`${idPrefix}-hint`} className="mt-1 flex justify-between text-xs text-muted">
        <span>0 = só pesquisando</span>
        <span>10 = quero contratar já</span>
      </div>
      {error && <p id={`${idPrefix}-error`} className="field-error">{error}</p>}
    </fieldset>
  );
}
