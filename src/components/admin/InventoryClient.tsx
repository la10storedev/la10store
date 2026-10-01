'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { InventoryCards } from '@/components/admin/InventoryCards'
import { InventoryTable } from '@/components/admin/InventoryTable'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { normalize } from '@/lib/format'
import type { Product } from '@/types/product'

type InventoryClientProps = {
  products: Product[]
}

/**
 * Cliente del inventario: buscador en tiempo real (nombre, equipo, liga) y la
 * vista responsive (tabla en desktop con `hidden md:block`, cards en mobile con
 * `md:hidden`).
 */
export function InventoryClient({ products }: InventoryClientProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = normalize(query.trim())
    if (!needle) return products
    return products.filter((product) =>
      normalize([product.name, product.team, product.league].join(' ')).includes(needle),
    )
  }, [products, query])

  if (products.length === 0) {
    return (
      <EmptyState
        title="Todavia no hay camisetas"
        description="Carga la primera para que aparezca en el catalogo publico."
        action={
          <ButtonLink href="/admin/productos/nuevo">Cargar la primera camiseta</ButtonLink>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, equipo o liga…"
          aria-label="Buscar camisetas por nombre, equipo o liga"
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pr-4 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
          Sin resultados para “{query}”. Probá con otro término.
        </p>
      ) : (
        <>
          <div className="hidden md:block">
            <InventoryTable products={filtered} />
          </div>
          <div className="md:hidden">
            <InventoryCards products={filtered} />
          </div>
        </>
      )}
    </div>
  )
}