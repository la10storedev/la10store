import type { ReactNode } from 'react'
import { TaxonomyClient, type TaxonomyTab } from '@/components/admin/TaxonomyClient'
import { getAdminLeagues, getAdminTeams } from '@/lib/taxonomy-store'

/**
 * PAGINA "EQUIPOS Y LIGAS" DEL PANEL.
 *
 * Server Component: lee las listas administradas de equipos y ligas/competiciones
 * y se las pasa a `TaxonomyClient`, un Client Component que arma las pestañas,
 * el buscador y las filas con edicion rapida (renombrar inline, activar,
 * asociar ligas y eliminar). Las acciones vuelven con codigos en `searchParams`
 * (`ok`, `error`, `n`) que esta pagina traduce a un banner.
 */
export default async function AdminEquiposPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ok?: string; error?: string; n?: string }>
}) {
  const [{ tab, ok, error, n }, teams, leagues] = await Promise.all([
    searchParams,
    getAdminTeams(),
    getAdminLeagues(),
  ])

  const activeTab: TaxonomyTab = tab === 'ligas' ? 'ligas' : 'equipos'
  const banner = buildBanner({ ok, error, n })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Equipos y ligas</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Listas maestras que usan las camisetas. Editá los nombres, activá o desactivá
          para que aparezcan en los filtros, asociá equipos con sus ligas y mandá a la
          papelera lo que ya no uses.
        </p>
      </div>

      {banner}

      <TaxonomyClient teams={teams} leagues={leagues} tab={activeTab} />
    </div>
  )
}

// ---------------------------------------------------------------------------

type BannerInput = { ok?: string; error?: string; n?: string }

/**
 * Traduce los codigos `ok` / `error` / `n` de `searchParams` a un banner
 * superior. Si no hay codigo, devuelve `null`.
 *
 * Mantener sincronizado con el switch de razones en `taxonomy-store.ts`
 * (duplicate, has_products, referenced, not_found, error).
 */
function buildBanner({ ok, error, n }: BannerInput): ReactNode {
  const count = Number(n)
  const safeCount = Number.isFinite(count) && count > 0 ? count : 0

  if (error) {
    let message = 'No pudimos completar la acción. Probá de nuevo.'
    switch (error) {
      case 'tiene_camisetas':
        message = `No se puede eliminar: todavía tiene ${safeCount} ${
          safeCount === 1 ? 'camiseta' : 'camisetas'
        }. Desactivala si no querés que aparezca en las listas.`
        break
      case 'referenciado':
        message = `No se puede eliminar definitivamente: quedan ${safeCount} ${
          safeCount === 1 ? 'camiseta' : 'camisetas'
        } que la referencian (aunque estén en Eliminados). Purgá esas camisetas primero.`
        break
      case 'duplicado':
        message = 'Ya existe un registro con ese nombre.'
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
      case 'creado':
        message = 'Registro creado.'
        break
      case 'renombrado':
        message = 'Nombre actualizado.'
        break
      case 'activado':
        message = 'Ahora aparece en las listas.'
        break
      case 'desactivado':
        message = 'Ya no aparece en las listas.'
        break
      case 'eliminado':
        message = 'Enviado a la papelera.'
        break
      case 'asociaciones':
        message = 'Ligas asociadas actualizadas.'
        break
    }
    if (message) return <BannerAlert tone="success" message={message} />
  }

  return null
}

function BannerAlert({ tone, message }: { tone: 'success' | 'error'; message: string }) {
  const styles =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : 'bg-red-50 text-red-700 ring-red-200'
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${styles}`}>
      {message}
    </p>
  )
}
