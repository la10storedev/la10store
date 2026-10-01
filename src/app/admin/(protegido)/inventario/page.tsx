import { InventoryClient } from '@/components/admin/InventoryClient'
import { ButtonLink } from '@/components/ui/Button'
import { getAllProducts } from '@/lib/products-store'

/**
 * INVENTARIO DEL PANEL (edicion rapida).
 *
 * Server Component: lee el catalogo completo (visibles + ocultos) y se lo pasa
 * a `InventoryClient`, un Client Component que filtra por busqueda y elige la
 * vista (tabla en desktop, cards en mobile). La edicion rapida de precio, stock
 * y toggles se resuelve con Server Actions + `revalidatePath`, sin recargar la
 * pagina.
 */
export default async function AdminInventory({
  searchParams,
}: {
  searchParams: Promise<{ eliminado?: string }>
}) {
  const [{ eliminado }, products] = await Promise.all([
    searchParams,
    getAllProducts({ includeHidden: true }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Inventario</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {products.length} camisetas cargadas · edición rápida de precio, stock, visibilidad y
            destacados.
          </p>
        </div>
        <ButtonLink href="/admin/productos/nuevo">Nueva camiseta</ButtonLink>
      </div>

      {eliminado ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Camiseta eliminada del catalogo. Podés restaurarla desde la sección Eliminados.
        </p>
      ) : null}

      <InventoryClient products={products} />
    </div>
  )
}