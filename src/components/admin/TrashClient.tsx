'use client'

import { useMemo, useRef, useState } from 'react'
import { Search, Trash2, Undo2 } from 'lucide-react'
import { restoreProductAction } from '@/app/admin/actions/products'
import {
  hardDeleteLeagueAction,
  hardDeleteProductAction,
  hardDeleteTeamAction,
  restoreLeagueAction,
  restoreTeamAction,
} from '@/app/admin/actions/taxonomy'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate, normalize } from '@/lib/format'
import { categoryLabels } from '@/lib/products'
import type { DeletedProduct } from '@/lib/products-store'
import type { DeletedLeague, DeletedTeam } from '@/types/product'

type TrashClientProps = {
  products: DeletedProduct[]
  teams: DeletedTeam[]
  leagues: DeletedLeague[]
}

/**
 * Cliente de la papelera unificada.
 *
 * Tres secciones (Camisetas / Equipos / Ligas) con un buscador global que
 * filtra las tres en simultaneo (mismo patron que `InventoryClient`:
 * minusculas y sin tildes). Cada fila expone Restaurar y Eliminar
 * definitivamente, con un `ConfirmDialog` que avisa que la purga es
 * irreversible.
 */
export function TrashClient({ products, teams, leagues }: TrashClientProps) {
  const [query, setQuery] = useState('')
  const needle = normalize(query.trim())

  const filteredProducts = useMemo(() => {
    if (!needle) return products
    return products.filter((product) =>
      normalize([product.name, product.team, product.league].join(' ')).includes(needle),
    )
  }, [products, needle])

  const filteredTeams = useMemo(() => {
    if (!needle) return teams
    return teams.filter((team) => normalize(team.name).includes(needle))
  }, [teams, needle])

  const filteredLeagues = useMemo(() => {
    if (!needle) return leagues
    return leagues.filter((league) => normalize(league.name).includes(needle))
  }, [leagues, needle])

  const totalShown = filteredProducts.length + filteredTeams.length + filteredLeagues.length
  const totalAll = products.length + teams.length + leagues.length

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en la papelera…"
          aria-label="Buscar en la papelera por nombre, equipo o liga"
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pr-4 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
        />
        {query ? (
          <p className="mt-2 text-xs text-zinc-500">
            {totalShown} de {totalAll}{' '}
            {totalAll === 1 ? 'resultado coincide' : 'resultados coinciden'} con “{query}”.
          </p>
        ) : null}
      </div>

      <TrashSection
        title="Camisetas"
        count={filteredProducts.length}
        total={products.length}
        emptyTitle="No hay camisetas en la papelera"
        emptyDescription="Las camisetas que elimines desde el inventario aparecen acá para que puedas restaurarlas."
      >
        {filteredProducts.map((product) => (
          <ProductTrashRow key={product.id} product={product} />
        ))}
      </TrashSection>

      <TrashSection
        title="Equipos"
        count={filteredTeams.length}
        total={teams.length}
        emptyTitle="No hay equipos en la papelera"
        emptyDescription="Los equipos que elimines desde Equipos y ligas aparecen acá."
      >
        {filteredTeams.map((team) => (
          <TeamTrashRow key={team.id} team={team} />
        ))}
      </TrashSection>

      <TrashSection
        title="Ligas"
        count={filteredLeagues.length}
        total={leagues.length}
        emptyTitle="No hay ligas en la papelera"
        emptyDescription="Las ligas que elimines desde Equipos y ligas aparecen acá."
      >
        {filteredLeagues.map((league) => (
          <LeagueTrashRow key={league.id} league={league} />
        ))}
      </TrashSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Seccion + filas
// ---------------------------------------------------------------------------

function TrashSection({
  title,
  count,
  total,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string
  count: number
  total: number
  emptyTitle: string
  emptyDescription: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`trash-section-${title}`} className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <h2 id={`trash-section-${title}`} className="text-sm font-bold uppercase tracking-wide text-zinc-500">
          {title}
        </h2>
        <Badge tone="neutral">
          {total} {total === 1 ? 'elemento' : 'elementos'}
        </Badge>
      </header>

      {total === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : count === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
          Ningún resultado de esta sección coincide con la búsqueda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">{children}</ul>
      )}
    </section>
  )
}

function ProductTrashRow({ product }: { product: DeletedProduct }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-semibold text-zinc-900">{product.name}</p>
        <p className="truncate text-xs text-zinc-500">
          {product.team} · {product.league}
        </p>
        <p className="mt-1 text-xs text-zinc-400">Eliminada el {formatDate(product.deletedAt)}</p>
      </div>
      <RowActions
        onRestore={restoreProductAction}
        onHardDelete={hardDeleteProductAction}
        id={product.id}
        label={product.name}
        kind="camiseta"
        warningCount={0}
      />
    </li>
  )
}

function TeamTrashRow({ team }: { team: DeletedTeam }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-semibold text-zinc-900">{team.name}</p>
        <p className="mt-1 truncate text-xs text-zinc-500">
          {categoryLabels[team.category]} · {team.productCount}{' '}
          {team.productCount === 1 ? 'camiseta asociada' : 'camisetas asociadas'}
        </p>
        <p className="mt-1 text-xs text-zinc-400">Eliminado el {formatDate(team.deletedAt)}</p>
      </div>
      <RowActions
        onRestore={restoreTeamAction}
        onHardDelete={hardDeleteTeamAction}
        id={team.id}
        label={team.name}
        kind="equipo"
        warningCount={team.productCount}
      />
    </li>
  )
}

function LeagueTrashRow({ league }: { league: DeletedLeague }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-semibold text-zinc-900">{league.name}</p>
        <p className="mt-1 truncate text-xs text-zinc-500">
          {categoryLabels[league.category]} · {league.productCount}{' '}
          {league.productCount === 1 ? 'camiseta' : 'camisetas'} · {league.teamCount}{' '}
          {league.teamCount === 1 ? 'equipo' : 'equipos'}
        </p>
        <p className="mt-1 text-xs text-zinc-400">Eliminada el {formatDate(league.deletedAt)}</p>
      </div>
      <RowActions
        onRestore={restoreLeagueAction}
        onHardDelete={hardDeleteLeagueAction}
        id={league.id}
        label={league.name}
        kind="liga"
        warningCount={league.productCount}
      />
    </li>
  )
}

// ---------------------------------------------------------------------------
// Acciones por fila: Restaurar + Eliminar definitivamente
// ---------------------------------------------------------------------------

/**
 * Wrapper de los dos botones por fila.
 *
 * - Restaurar: submit plano via `<form action>` (funciona sin JS).
 * - Eliminar definitivamente: intercepta el submit para abrir el
 *   `ConfirmDialog` (patron `DeleteProductForm`). Si el registro todavia
 *   tiene camisetas referenciandolo, el dialogo avisa que la purga va a
 *   fallar — la accion devolvera `referenciado` con un banner.
 */
function RowActions({
  id,
  label,
  kind,
  onRestore,
  onHardDelete,
  warningCount,
}: {
  id: string
  label: string
  kind: 'camiseta' | 'equipo' | 'liga'
  onRestore: (formData: FormData) => Promise<void>
  onHardDelete: (formData: FormData) => Promise<void>
  warningCount: number
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <RestoreForm id={id} action={onRestore} />
      <HardDeleteForm
        id={id}
        label={label}
        kind={kind}
        action={onHardDelete}
        warningCount={warningCount}
      />
    </div>
  )
}

function RestoreForm({
  id,
  action,
}: {
  id: string
  action: (formData: FormData) => Promise<void>
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm">
        <Undo2 className="size-3.5" aria-hidden /> Restaurar
      </Button>
    </form>
  )
}

function HardDeleteForm({
  id,
  label,
  kind,
  action,
  warningCount,
}: {
  id: string
  label: string
  kind: 'camiseta' | 'equipo' | 'liga'
  action: (formData: FormData) => Promise<void>
  warningCount: number
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const confirmedRef = useRef(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const subject = SUBJECT_LABEL[kind](label)
  const baseMessage = `Esta acción no se puede deshacer: ${subject} se borra para siempre.`
  const warning =
    warningCount > 0
      ? ` Igual hay ${warningCount} ${
          warningCount === 1 ? 'camiseta' : 'camisetas'
        } que la referencian, así que la purga va a fallar y te diremos cómo seguir.`
      : ''

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onSubmit={(event) => {
          if (confirmedRef.current) {
            confirmedRef.current = false
            return
          }
          event.preventDefault()
          setShowConfirm(true)
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="danger" size="sm">
          <Trash2 className="size-3.5" aria-hidden /> Eliminar definitivamente
        </Button>
      </form>
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          confirmedRef.current = true
          formRef.current?.requestSubmit()
        }}
        title="Eliminar definitivamente"
        message={`${baseMessage}${warning}`}
        confirmLabel="Eliminar definitivamente"
        cancelLabel="Cancelar"
      />
    </>
  )
}

const SUBJECT_LABEL: Record<'camiseta' | 'equipo' | 'liga', (label: string) => string> = {
  camiseta: (label) => `la camiseta "${label}"`,
  equipo: (label) => `el equipo "${label}" y todas sus asociaciones`,
  liga: (label) => `la liga "${label}" y todas sus asociaciones`,
}
