'use client'

import type { ProductSize } from '@/types/product'

type SizeSelectorProps = {
  sizes: ProductSize[]
  /** Talle elegido. */
  value?: string
  onChange: (size: string) => void
  className?: string
}

/**
 * Selector de talles.
 * - Controlado (`value` + `onChange`) para que el padre arme el link de WhatsApp.
 * - Los talles sin stock se muestran deshabilitados (no se ocultan: informar
 *   "XS agotado" es mejor que una grilla que cambia de forma).
 * - Estetica: botones rectos; el elegido se rellena de negro.
 */
export function SizeSelector({ sizes, value, onChange, className = '' }: SizeSelectorProps) {
  if (sizes.length === 0) {
    return (
      <p className={['text-sm text-zinc-500', className].filter(Boolean).join(' ')}>
        No hay talles cargados para esta camiseta.
      </p>
    )
  }

  return (
    <div
      className={['flex flex-wrap gap-2', className].filter(Boolean).join(' ')}
      role="group"
      aria-label="Talle"
    >
      {sizes.map((size) => {
        const soldOut = size.stock <= 0
        const selected = value === size.size

        return (
          <button
            key={size.size}
            type="button"
            disabled={soldOut}
            aria-pressed={selected}
            onClick={() => onChange(size.size)}
            title={soldOut ? `${size.size} sin stock — consultar por WhatsApp` : `${size.size} · ${size.stock} disponibles`}
            className={[
              'min-w-12 border px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] transition-colors',
              soldOut
                ? 'cursor-not-allowed border-dashed border-brand-300 bg-brand-50 text-brand-800'
                : selected
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-300 bg-white text-zinc-950 hover:border-zinc-950',
            ].join(' ')}
          >
            <span className="block leading-tight">{size.size}</span>
            {soldOut ? (
              <span className="block text-[9px] font-medium normal-case tracking-normal">
                Consultar
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
