'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
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
import { categoryLabels, totalStock } from '@/lib/products'
import {
  sortInventory,
  type SortDirection,
  type SortField,
} from '@/lib/inventory-sort'
import type { Product } from '@/types/product'

/**
 * Tabla de inventario para desktop (>= 768px). Cada fila ofrece edicion rapida:
 * precio inline, stock en popover y toggles de visible/destacado que escriben
 * via Server Actions. Los headers de Camiseta/Precio/Stock ordenan la lista
 * (asc/desc alternando con cada click).
 */
export function InventoryTable({ products }: { products: Product[] }) {
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
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">Listado de camisetas con edicion rapida</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <SortableTh
              label="Camiseta"
              field="name"
              sortField={sortField}
              sortDirection={sortDirection}
              onToggle={toggleSort}
            />
            <SortableTh
              label="Precio"
              field="price"
              sortField={sortField}
              sortDirection={sortDirection}
              onToggle={toggleSort}
            />
            <SortableTh
              label="Stock"
              field="stock"
              sortField={sortField}
              sortDirection={sortDirection}
              onToggle={toggleSort}
            />
            <th scope="col" className="px-4 py-3 font-semibold">Visible</th>
            <th scope="col" className="px-4 py-3 font-semibold">Destacado</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sorted.map((product) => (
            <InventoryRow key={product.id} product={product} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SortableTh({
  label,
  field,
  sortField,
  sortDirection,
  onToggle,
}: {
  label: string
  field: SortField
  sortField: SortField | null
  sortDirection: SortDirection
  onToggle: (field: SortField) => void
}) {
  const active = sortField === field

  return (
    <th
      scope="col"
      aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-4 py-3 font-semibold"
    >
      <button
        type="button"
        onClick={() => onToggle(field)}
        className="inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-zinc-900"
      >
        {label}
        {active ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="size-3.5 text-zinc-700" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5 text-zinc-700" aria-hidden />
          )
        ) : (
          <ChevronsUpDown className="size-3.5 text-zinc-300" aria-hidden />
        )}
      </button>
    </th>
  )
}

function InventoryRow({ product }: { product: Product }) {
  const hidden = product.visible === false
  const units = totalStock(product)
  const initials = product.team
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

  return (
    <tr
      className={
        hidden
          ? 'bg-zinc-50/60 align-middle hover:bg-zinc-50'
          : 'align-middle hover:bg-zinc-50/60'
      }
    >
      <th scope="row" className="px-4 py-3 text-left font-normal">
        <div className="flex items-center gap-3">
          <span
            className={[
              'size-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100',
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
          <span className="min-w-0">
            <Link
              href={`/admin/productos/${product.id}/editar`}
              className={[
                'block truncate font-semibold hover:text-brand-700',
                hidden ? 'text-zinc-500' : 'text-zinc-900',
              ].join(' ')}
            >
              {product.name}
            </Link>
            <span className="block truncate text-xs text-zinc-500">
              {product.team} · {product.league} · {categoryLabels[product.category]}
            </span>
          </span>
        </div>
      </th>

      <td className="px-4 py-3">
        <InlinePrice product={product} />
      </td>

      <td className="px-4 py-3">
        <StockPopover product={product}>{units} u.</StockPopover>
      </td>

      <td className="px-4 py-3">
        <VisibilityToggle product={product} />
      </td>

      <td className="px-4 py-3">
        <FeaturedToggle product={product} />
      </td>

      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <ButtonLink href={`/admin/productos/${product.id}/editar`} variant="outline" size="sm">
            Editar
          </ButtonLink>
          <DeleteProductForm id={product.id} name={product.name} />
        </div>
      </td>
    </tr>
  )
}

function VisibilityToggle({ product }: { product: Product }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Toggle
      checked={product.visible !== false}
      label="Visible"
      disabled={isPending}
      onChange={(checked) => {
        const formData = new FormData()
        formData.set('id', product.id)
        formData.set('visible', String(checked))
        startTransition(() => {
          void toggleVisibilityAction(formData)
        })
      }}
    />
  )
}

function FeaturedToggle({ product }: { product: Product }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Toggle
      checked={product.featured}
      label="Destacado"
      disabled={isPending}
      onChange={(checked) => {
        const formData = new FormData()
        formData.set('id', product.id)
        formData.set('featured', String(checked))
        startTransition(() => {
          void setProductFeaturedAction(formData)
        })
      }}
    />
  )
}