'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DeleteProductForm } from '@/components/admin/DeleteProductForm'
import { InlinePrice } from '@/components/admin/InlinePrice'
import { StockPopover } from '@/components/admin/StockPopover'
import { ProductImage } from '@/components/products/ProductImage'
import { ButtonLink } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import {
  setProductFeaturedAction,
  toggleVisibilityAction,
} from '@/app/admin/actions/products'
import { totalStock } from '@/lib/products'
import {
  SORT_FIELDS,
  SORT_LABELS,
  sortInventory,
  type SortDirection,
  type SortField,
} from '@/lib/inventory-sort'
import type { Product } from '@/types/product'

/**
 * Cards de inventario para mobile (< 768px): imagen 64x64 a la izquierda,
 * nombre/equipo a la derecha, precio editable, toggles y acciones de stock.
 * Arriba de la lista hay botones de ordenamiento (nombre/precio/stock).
 */
export function InventoryCards({ products }: { products: Product[] }) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sorted = useMemo(
    () => (sortField ? sortInventory(products, sortField, sortDirection) : products),
    [products, sortField, sortDirection],
  )

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Ordenar camisetas"
        className="flex flex-wrap gap-2"
      >
        {SORT_FIELDS.map((field) => {
          const active = sortField === field
          return (
            <button
              key={field}
              type="button"
              onClick={() => toggleSort(field)}
              aria-pressed={active}
              className={[
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500 hover:text-zinc-900',
              ].join(' ')}
            >
              {SORT_LABELS[field]}
              {active ? (
                sortDirection === 'asc' ? (
                  <ChevronUp className="size-3.5" aria-hidden />
                ) : (
                  <ChevronDown className="size-3.5" aria-hidden />
                )
              ) : null}
            </button>
          )
        })}
      </div>

      <ul className="flex flex-col gap-3">
        {sorted.map((product) => (
          <li
            key={product.id}
            className="rounded-2xl border border-zinc-200 bg-white p-3"
          >
            <InventoryCard product={product} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function InventoryCard({ product }: { product: Product }) {
  const hidden = product.visible === false
  const units = totalStock(product)
  const initials = product.team
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

  const [isPending, startTransition] = useTransition()

  const runAction = (action: (formData: FormData) => Promise<void>, key: string, value: boolean) => {
    const formData = new FormData()
    formData.set('id', product.id)
    formData.set(key, String(value))
    startTransition(() => {
      void action(formData)
    })
  }

  return (
    <div className="flex gap-3">
      <span
        className={[
          'size-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100',
          hidden ? 'opacity-50 grayscale' : '',
        ].join(' ')}
      >
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          colors={product.colors}
          initials={initials}
          className="size-full object-cover"
        />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/productos/${product.id}/editar`}
          className={[
            'block truncate font-semibold hover:text-brand-700',
            hidden ? 'text-zinc-500' : 'text-zinc-900',
          ].join(' ')}
        >
          {product.name}
        </Link>
        <p className="truncate text-xs text-zinc-500">
          {product.team} · {product.league}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <InlinePrice product={product} />
          <span aria-hidden className="text-zinc-300">
            ·
          </span>
          <StockPopover product={product}>
            <span className="text-xs">{units} u.</span>
          </StockPopover>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Toggle
            checked={product.visible !== false}
            label="Visible"
            disabled={isPending}
            onChange={(checked) => runAction(toggleVisibilityAction, 'visible', checked)}
          />
          <Toggle
            checked={product.featured}
            label="Destacado"
            disabled={isPending}
            onChange={(checked) => runAction(setProductFeaturedAction, 'featured', checked)}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <ButtonLink
            href={`/admin/productos/${product.id}/editar`}
            variant="outline"
            size="sm"
          >
            Editar
          </ButtonLink>
          <DeleteProductForm id={product.id} name={product.name} />
        </div>
      </div>
    </div>
  )
}