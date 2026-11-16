const STEPS = Array.from({ length: 10 }, (_, i) => (i + 1) / 2);
const fmt = (n: number) => String(n).replace('.', ',');
export const ratingLabel = (n: number) => `${fmt(n)} ${n > 1 ? 'estrelas' : 'estrela'}`;

/** Read-only stars, e.g. "★★★½". */
export function Stars({ value }: { value: number }) {
  return (
    <span aria-label={ratingLabel(value)} className="text-warn">
      {'★'.repeat(Math.floor(value))}
      {value % 1 ? '½' : ''}
    </span>
  );
}

/** 0,5–5 in half steps, plus "Sem nota". Plain radios: works without JavaScript. */
export function StarRating({ name, defaultValue }: { name: string; defaultValue?: number | null }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">Nota</legend>
      <div className="flex flex-wrap gap-1">
        <label className="cursor-pointer rounded border border-line px-2 py-1 text-sm has-[:checked]:border-warn has-[:checked]:bg-warn/15">
          <input type="radio" name={name} value="" defaultChecked={defaultValue == null} className="sr-only" aria-label="Sem nota" />
          Sem nota
        </label>
        {STEPS.map((n) => (
          <label key={n} className="cursor-pointer rounded border border-line px-2 py-1 text-sm has-[:checked]:border-warn has-[:checked]:bg-warn/15">
            <input type="radio" name={name} value={String(n)} defaultChecked={defaultValue === n} className="sr-only" aria-label={ratingLabel(n)} />
            <span aria-hidden="true">{fmt(n)}★</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
