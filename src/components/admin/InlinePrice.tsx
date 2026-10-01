'use client'

import { useRef, useState, useTransition } from 'react'
import { updatePriceAction } from '@/app/admin/actions/products'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/types/product'

type InlinePriceProps = {
  product: Product
  className?: string
}

/**
 * Precio editable inline.
 *
 * Muestra el precio formateado; al hacer clic se convierte en un input
 * numerico. Enter o blur confirman (Server Action `updatePriceAction`), Escape
 * cancela. Un ref guard evita confirmar dos veces si Enter y blur se disparan
 * en cadena al desmontar el input.
 */
export function InlinePrice({ product, className = '' }: InlinePriceProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(product.price))
  const [isPending, startTransition] = useTransition()
  const committedRef = useRef(false)

  const commit = () => {
    if (committedRef.current) return
    committedRef.current = true

    const parsed = Number(value)
    const next = Number.isFinite(parsed) ? Math.round(parsed) : product.price
    if (next !== product.price) {
      const formData = new FormData()
      formData.set('id', product.id)
      formData.set('price', String(next))
      startTransition(() => {
        void updatePriceAction(formData)
      })
    }
    setValue(String(product.price))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') {
            committedRef.current = true
            setValue(String(product.price))
            setEditing(false)
          }
        }}
        aria-label={`Editar precio de ${product.name}`}
        className="w-28 rounded-lg border border-zinc-300 px-2 py-1 text-right text-sm font-semibold tabular-nums text-zinc-900 focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        committedRef.current = false
        setValue(String(product.price))
        setEditing(true)
      }}
      title="Hacer clic para editar el precio"
      className={[
        'rounded-lg px-2 py-1 font-semibold text-zinc-900 transition hover:bg-zinc-100',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        className,
      ].join(' ')}
    >
      {isPending ? '…' : formatPrice(product.price)}
    </button>
  )
}