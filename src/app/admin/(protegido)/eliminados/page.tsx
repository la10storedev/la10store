import { getDeletedProducts } from '@/lib/products-store'
import { formatDate } from '@/lib/format'
import { EmptyState } from '@/components/ui/EmptyState'
import { RestoreProductForm } from '@/components/admin/RestoreProductForm'

/**
 * CAMISETAS ELIMINADAS (soft delete).
 *
 * Server Component: lee los productos con `deleted_at` seteado y ofrece
 * restaurarlos. Restaurar vuelve la camiseta al inventario con su visibilidad
 * previa intacta.
 */
export default async function AdminDeletedProducts({
  searchParams,
}: {
  searchParams: Promise<{ restaurado?: string }>
}) {
  const [{ restaurado }, deleted] = await Promise.all([searchParams, getDeletedProducts()])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Camisetas eliminadas</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {deleted.length > 0
            ? `${deleted.length} camisetas eliminadas. Podés restaurarlas cuando quieras.`
            : 'Acá aparecen las camisetas que eliminás desde el inventario.'}
        </p>
      </div>

      {restaurado ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Camiseta restaurada al inventario.
        </p>
      ) : null}

      {deleted.length === 0 ? (
        <EmptyState
          title="No hay camisetas eliminadas"
          description="Cuando elimines una camiseta desde el inventario, aparece acá para poder restaurarla."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {deleted.map((product) => (
            <li
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-900">{product.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {product.team} · {product.league}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Eliminada el {formatDate(product.deletedAt)}
                </p>
              </div>
              <RestoreProductForm id={product.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}