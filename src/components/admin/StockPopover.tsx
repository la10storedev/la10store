'use client'

import { useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { adjustStockAction } from '@/app/admin/actions/products'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import type { Product } from '@/types/product'

type StockPopoverProps = {
  product: Product
  /** Contenido del trigger, por ejemplo "45 u.". */
  children: ReactNode
}

/**
 * Popover de stock por talle.
 *
 * Muestra un input numerico por talle con el stock actual. "Guardar" envia una
 * Server Action (`adjustStockAction`) por cada talle cuyo valor cambio y cierra
 * el popover; la pagina se re-renderiza via `revalidatePath`.
 */
export function StockPopover({ product, children }: StockPopoverProps) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.sizes.map((size) => [size.size, String(size.stock)])),
  )
  const [isPending, startTransition] = useTransition()

  const changed = product.sizes.filter((size) => {
    const parsed = Number(values[size.size])
    const next = Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : size.stock
    return next !== size.stock
  })

  const save = () => {
    if (changed.length === 0) {
      setOpen(false)
      return
    }
    startTransition(() => {
      for (const size of changed) {
        const formData = new FormData()
        formData.set('id', product.id)
        formData.set('size', size.size)
        formData.set('stock', String(Math.max(0, Math.trunc(Number(values[size.size])))))
        void adjustStockAction(formData)
      }
    })
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <span className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-700 underline decoration-zinc-300 decoration-dotted underline-offset-4 transition hover:bg-zinc-100 hover:text-zinc-950">
          {children}
        </span>
      }
    >
      <div className="flex min-w-52 flex-col gap-3 p-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Stock por talle
        </p>

        {product.sizes.length === 0 ? (
          <p className="text-sm text-zinc-500">Este producto no tiene talles cargados.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {product.sizes.map((size) => (
              <label
                key={size.size}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="font-semibold text-zinc-800">{size.size}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={values[size.size]}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [size.size]: event.target.value }))
                  }
                  aria-label={`Stock del talle ${size.size} de ${product.name}`}
                  className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-right text-sm tabular-nums text-zinc-900 focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
                />
              </label>
            ))}
          </div>
        )}

        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={isPending || changed.length === 0}
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </Popover>
  )
}