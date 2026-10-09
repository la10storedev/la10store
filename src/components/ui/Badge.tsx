import type { ComponentPropsWithoutRef } from 'react'

/**
 * Etiqueta pequena de estado/categoria.
 * Estilo editorial: recta, en mayusculas y con color de texto mas que de fondo,
 * para no competir con la imagen del producto.
 */
export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  brand: 'bg-brand-600 text-white dark:bg-brand-500',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
}

type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]',
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
