import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/**
 * Controles de formulario reutilizables.
 *
 * `Field` envuelve label + control + ayuda/error, y expone un `id` derivado
 * para asociarlos correctamente (accesibilidad: label `htmlFor` + `aria-describedby`).
 */

const controlBase =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 ' +
  'placeholder:text-zinc-400 transition ' +
  'focus:border-brand-600 focus:outline-2 focus:outline-offset-0 focus:outline-brand-600/40 ' +
  'disabled:cursor-not-allowed disabled:bg-zinc-50'

type FieldProps = {
  /** Debe coincidir con el `id` del control hijo. */
  htmlFor: string
  label: string
  hint?: ReactNode
  error?: string
  /** Ocupa todo el ancho de la grilla del formulario. */
  className?: string
  children: ReactNode
}

export function Field({ htmlFor, label, hint, error, className = '', children }: FieldProps) {
  return (
    <div className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function describedBy(id: string | undefined, hint?: ReactNode, error?: string) {
  if (!id) return undefined
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

type InputProps = ComponentPropsWithoutRef<'input'> & {
  /** Opcional: si falta, el control no se asocia a un `Field`. */
  id?: string
  invalid?: boolean
  hint?: ReactNode
}

export function Input({ id, invalid, hint, className = '', ...props }: InputProps) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, hint, props['aria-describedby'] as string | undefined)}
      className={[controlBase, invalid ? 'border-red-400' : '', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

type TextareaProps = ComponentPropsWithoutRef<'textarea'> & {
  id: string
  invalid?: boolean
  hint?: ReactNode
}

export function Textarea({ id, invalid, hint, className = '', rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      id={id}
      rows={rows}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, hint, props['aria-describedby'] as string | undefined)}
      className={[controlBase, 'resize-y', invalid ? 'border-red-400' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}

type SelectProps = ComponentPropsWithoutRef<'select'> & {
  id: string
  invalid?: boolean
  hint?: ReactNode
}

export function Select({ id, invalid, hint, className = '', children, ...props }: SelectProps) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, hint, props['aria-describedby'] as string | undefined)}
      className={[controlBase, 'appearance-none pr-8', invalid ? 'border-red-400' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </select>
  )
}

/** Casilla de verificacion con label clickeable. */
type CheckboxProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  id: string
  label: ReactNode
}

export function Checkbox({ id, label, className = '', ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={[
        'flex cursor-pointer items-center gap-2.5 text-sm font-medium text-zinc-800 select-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        id={id}
        type="checkbox"
        className="size-4 shrink-0 rounded border-zinc-300 text-brand-600 accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        {...props}
      />
      {label}
    </label>
  )
}
