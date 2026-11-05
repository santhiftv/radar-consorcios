import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'navy';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-green text-white hover:bg-brand-green-dark shadow-sm',
  navy: 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm',
  secondary: 'bg-white text-navy-900 border border-line hover:border-navy-700 hover:bg-navy-50',
  ghost: 'text-navy-900 hover:bg-navy-50',
  danger: 'bg-danger text-white hover:opacity-90',
};
const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-[15px]',
  lg: 'px-6 py-3.5 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

export function Card({ className, children, ...rest }: ComponentProps<'div'>) {
  return (
    <div {...rest} className={cx('card', className)}>
      {children}
    </div>
  );
}

type Tone = 'neutral' | 'green' | 'navy' | 'warn' | 'danger';
const tones: Record<Tone, string> = {
  neutral: 'bg-navy-50 text-navy-800',
  green: 'bg-brand-green-soft text-brand-green-dark',
  navy: 'bg-navy-900 text-white',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('badge', tones[tone], className)}>{children}</span>;
}

export function Alert({ tone = 'neutral', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const border: Record<Tone, string> = {
    neutral: 'border-navy-100 bg-navy-50',
    green: 'border-brand-green/30 bg-brand-green-soft',
    navy: 'border-navy-800 bg-navy-900 text-white',
    warn: 'border-warn/30 bg-warn-soft',
    danger: 'border-danger/30 bg-danger-soft',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('rounded-xl border px-4 py-3 text-sm', border[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cx(title && 'mt-1', 'leading-relaxed')}>{children}</div>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, align = 'left' }: { eyebrow?: string; title: string; description?: string; align?: 'left' | 'center' }) {
  return (
    <div className={cx('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-green-dark">{eyebrow}</p>}
      <h2 className="text-3xl font-bold sm:text-[2.1rem] sm:leading-tight">{title}</h2>
      {description && <p className="mt-3 text-lg text-muted">{description}</p>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-navy-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-semibold text-navy-900">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Table({ headers, children, empty }: { headers: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-navy-50">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 text-left font-semibold text-navy-900">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {empty ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-muted">
                Nenhum registro.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cx('whitespace-nowrap px-4 py-3 align-top', className)}>{children}</td>;
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function formatDateTime(v: string | null | undefined) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(v));
}

export function formatDate(v: string | null | undefined) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(v));
}
