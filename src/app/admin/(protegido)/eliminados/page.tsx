import type { ReactNode } from 'react'
import { TrashClient } from '@/components/admin/TrashClient'
import { getDeletedProducts } from '@/lib/products-store'
import { getDeletedLeagues, getDeletedTeams } from '@/lib/taxonomy-store'

/**
 * PAPELERA UNIFICADA DEL PANEL.
 *
 * Server Component: lee las tres listas en paralelo (camisetas, equipos y
 * ligas) y se las pasa a `TrashClient`. Las acciones vuelven con codigos en
 * `searchParams` (`ok`, `error`, `restaurado` legacy) que esta pagina traduce
 * a un banner.
 */
export default async function AdminTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; n?: string; restaurado?: string }>
}) {
  const [{ ok, error, n, restaurado }, products, teams, leagues] = await Promise.all([
    searchParams,
    getDeletedProducts(),
    getDeletedTeams(),
    getDeletedLeagues(),
  ])

  const total = products.length + teams.length + leagues.length
  const banner = buildTrashBanner({ ok, error, n, restaurado })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Papelera</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          {total > 0
            ? `${total} ${
                total === 1 ? 'elemento en la papelera' : 'elementos en la papelera'
              }. Podés restaurar lo que quieras o eliminarlo definitivamente.`
            : 'Acá caen las camisetas, equipos y ligas que sacás del catálogo.'}
        </p>
      </div>

      {banner}

      <TrashClient products={products} teams={teams} leagues={leagues} />
    </div>
  )
}

// ---------------------------------------------------------------------------

type BannerInput = { ok?: string; error?: string; n?: string; restaurado?: string }

/**
 * Banner superior a partir de los codigos de `searchParams`.
 *
 * - `ok=restaurado` o `restaurado=1` (legacy de la papelera de camisetas):
 *   confirmacion de que se restauro algo.
 * - `ok=purgado`: confirmacion de un eliminado definitivo.
 * - `error=referenciado&n=N`: la accion intento purgar pero hay camisetas
 *   que siguen referenciando el registro (incluso en la papelera).
 */
function buildTrashBanner({ ok, error, n, restaurado }: BannerInput): ReactNode {
  const count = Number(n)
  const safeCount = Number.isFinite(count) && count > 0 ? count : 0

  if (error) {
    let message = 'No pudimos completar la acción. Probá de nuevo.'
    switch (error) {
      case 'referenciado':
        message = `No se puede eliminar definitivamente: quedan ${safeCount} ${
          safeCount === 1 ? 'camiseta' : 'camisetas'
        } que la referencian. Purgá esas camisetas primero.`
        break
      case 'no_encontrado':
        message = 'No encontramos ese registro.'
        break
    }
    return <BannerAlert tone="error" message={message} />
  }

  if (ok) {
    let message: string | null = null
    switch (ok) {
      case 'restaurado':
        message = 'Restaurado al inventario.'
        break
      case 'purgado':
        message = 'Eliminado definitivamente.'
        break
    }
    if (message) return <BannerAlert tone="success" message={message} />
  }

  // Compat: `restoreProductAction` redirige con `restaurado=1`.
  if (restaurado) {
    return <BannerAlert tone="success" message="Camiseta restaurada al inventario." />
  }

  return null
}

function BannerAlert({ tone, message }: { tone: 'success' | 'error'; message: string }) {
  const styles =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : 'bg-red-50 text-red-700 ring-red-200'
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${styles}`}
    >
      {message}
    </p>
  )
}
