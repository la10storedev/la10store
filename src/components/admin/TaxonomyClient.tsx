'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, Network, Search, Trash2 } from 'lucide-react'
import {
  createLeagueAction,
  createTeamAction,
  deleteLeagueAction,
  deleteTeamAction,
  renameLeagueAction,
  renameTeamAction,
  setTeamLeaguesAction,
  toggleLeagueActiveAction,
  toggleTeamActiveAction,
} from '@/app/admin/actions/taxonomy'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Popover } from '@/components/ui/Popover'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { normalize } from '@/lib/format'
import { categoryLabels } from '@/lib/products'
import type { ManagedLeague, ManagedTeam, ProductCategory } from '@/types/product'

export type TaxonomyTab = 'equipos' | 'ligas'

/** Estado del filtro de categoria: 'all' = sin filtro. */
type CategoryFilter = 'all' | ProductCategory

/**
 * Opciones del filtro de categoria. Los labels se reusan de `categoryLabels`
 * para no duplicar textos en distintos lugares de la UI.
 */
const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'seleccion', label: categoryLabels.seleccion },
  { value: 'club', label: categoryLabels.club },
]

type TaxonomyClientProps = {
  teams: ManagedTeam[]
  leagues: ManagedLeague[]
  tab: TaxonomyTab
}

/**
 * Cliente del panel "Equipos y ligas".
 *
 * Renderiza las pestañas Equipos / Ligas con su contador, un buscador
 * instantaneo (mismo patron que `InventoryClient`: minusculas y sin tildes),
 * un filtro por categoria (Todos / Selecciones / Clubes) y, segun la pestaña
 * activa, el formulario de alta y la tabla con edicion rapida.
 *
 * Busqueda y filtro de categoria se aplican en composicion (AND): primero
 * categoria (mas barato), despues busqueda normalizada. El filtro es client
 * state (no URL) y se hereda entre pestañas porque comparte el mismo campo
 * `category` en `ManagedTeam` / `ManagedLeague`.
 *
 * La edicion rapida sigue los patrones existentes:
 * - Nombre inline (`InlinePrice`): click → input → Enter/blur guarda,
 *   Escape cancela, ref-guard evita doble commit.
 * - Toggle de Activo dispara la Server Action con hidden `id` + `active`.
 * - Boton "Ligas" abre un popover con checkboxes de las ligas de la MISMA
 *   categoria; Guardar envia `setTeamLeaguesAction(teamId, leagueIds)` con todos
 *   los marcados (la accion desactiva los no marcados).
 * - Boton "Eliminar" intercepta el submit para mostrar un `ConfirmDialog`
 *   (patron `DeleteProductForm`); si el registro tiene camisetas, el dialogo
 *   avisa que igual se va a intentar y la accion devolvera el codigo
 *   `tiene_camisetas` con un banner.
 */
export function TaxonomyClient({ teams, leagues, tab }: TaxonomyClientProps) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  // Primero filtramos por categoria (mas barato: comparacion directa) y
  // despues aplicamos la busqueda normalizada.
  const teamsByCategory = useMemo(
    () => applyCategoryFilter(teams, categoryFilter),
    [teams, categoryFilter],
  )
  const leaguesByCategory = useMemo(
    () => applyCategoryFilter(leagues, categoryFilter),
    [leagues, categoryFilter],
  )

  const filteredTeams = useFilter(teamsByCategory, query, (team) => team.name)
  const filteredLeagues = useFilter(leaguesByCategory, query, (league) => league.name)

  // Los contadores de las pestañas reflejan el TOTAL (no el filtro): son
  // navegacion entre vistas, no un indicador del filtro activo. Asi se
  // mantiene consistencia con la papelera y el inventario.
  const hasActiveFilter = query.trim().length > 0 || categoryFilter !== 'all'

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Equipos y ligas" className="inline-flex w-fit rounded-xl border border-zinc-200 bg-white p-1">
        <TabLink href="/admin/equipos?tab=equipos" active={tab === 'equipos'} count={teams.length}>
          Equipos
        </TabLink>
        <TabLink href="/admin/equipos?tab=ligas" active={tab === 'ligas'} count={leagues.length}>
          Ligas
        </TabLink>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <SearchInput value={query} onChange={setQuery} className="flex-1 sm:max-w-md" />
        <CategoryFilterControl value={categoryFilter} onChange={setCategoryFilter} />
      </div>

      {tab === 'equipos' ? (
        <TeamsPanel
          teams={filteredTeams}
          allLeagues={leagues}
          totalTeams={teams.length}
          hasActiveFilter={hasActiveFilter}
        />
      ) : (
        <LeaguesPanel
          leagues={filteredLeagues}
          totalLeagues={leagues.length}
          hasActiveFilter={hasActiveFilter}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tablas (desktop) + Cards (mobile)
// ---------------------------------------------------------------------------

function TeamsPanel({
  teams,
  allLeagues,
  totalTeams,
  hasActiveFilter,
}: {
  teams: ManagedTeam[]
  allLeagues: ManagedLeague[]
  totalTeams: number
  hasActiveFilter: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <CreateForm kind="team" />
      {teams.length === 0 ? (
        totalTeams === 0 ? (
          <EmptyHint
            title="Sin equipos"
            description="Todavía no hay equipos cargados. Usá el formulario de arriba para crear el primero."
          />
        ) : (
          <NoMatchesHint kind="equipos" hasActiveFilter={hasActiveFilter} />
        )
      ) : (
        <>
          <div className="hidden md:block">
            <TeamsTable teams={teams} allLeagues={allLeagues} />
          </div>
          <div className="md:hidden">
            <TeamsCards teams={teams} allLeagues={allLeagues} />
          </div>
        </>
      )}
    </div>
  )
}

function LeaguesPanel({
  leagues,
  totalLeagues,
  hasActiveFilter,
}: {
  leagues: ManagedLeague[]
  totalLeagues: number
  hasActiveFilter: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <CreateForm kind="league" />
      {leagues.length === 0 ? (
        totalLeagues === 0 ? (
          <EmptyHint
            title="Sin ligas"
            description="Todavía no hay ligas o competiciones cargadas. Usá el formulario de arriba para crear la primera."
          />
        ) : (
          <NoMatchesHint
            kind="ligas"
            hasActiveFilter={hasActiveFilter}
          />
        )
      ) : (
        <>
          <div className="hidden md:block">
            <LeaguesTable leagues={leagues} />
          </div>
          <div className="md:hidden">
            <LeaguesCards leagues={leagues} />
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabla + cards de equipos (desktop / mobile)
// ---------------------------------------------------------------------------

function TeamsTable({ teams, allLeagues }: { teams: ManagedTeam[]; allLeagues: ManagedLeague[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[44rem] text-sm">
        <caption className="sr-only">Listado de equipos con edicion rapida</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Equipo</th>
            <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
            <th scope="col" className="px-4 py-3 font-semibold">Camisetas</th>
            <th scope="col" className="px-4 py-3 font-semibold">Activo</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {teams.map((team) => (
            <TeamRow key={team.id} team={team} allLeagues={allLeagues} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TeamRow({ team, allLeagues }: { team: ManagedTeam; allLeagues: ManagedLeague[] }) {
  const dimmed = !team.active
  return (
    <tr className={dimmed ? 'bg-zinc-50/60 align-middle hover:bg-zinc-50' : 'align-middle hover:bg-zinc-50/60'}>
      <th scope="row" className="px-4 py-3 text-left font-normal">
        <InlineName
          id={team.id}
          initialValue={team.name}
          action={renameTeamAction}
          ariaLabel={`Editar nombre del equipo ${team.name}`}
          disabled={dimmed}
        />
      </th>
      <td className="px-4 py-3">
        <CategoryBadge category={team.category} />
      </td>
      <td className="px-4 py-3 text-zinc-700 tabular-nums">
        {team.productCount} {team.productCount === 1 ? 'camiseta' : 'camisetas'}
      </td>
      <td className="px-4 py-3">
        <ActiveToggle id={team.id} active={team.active} action={toggleTeamActiveAction} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <TeamLeaguesPopover team={team} allLeagues={allLeagues} />
          <DeleteTeamForm id={team.id} name={team.name} productCount={team.productCount} />
        </div>
      </td>
    </tr>
  )
}

function TeamsCards({ teams, allLeagues }: { teams: ManagedTeam[]; allLeagues: ManagedLeague[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {teams.map((team) => (
        <li key={team.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
          <TeamCard team={team} allLeagues={allLeagues} />
        </li>
      ))}
    </ul>
  )
}

function TeamCard({ team, allLeagues }: { team: ManagedTeam; allLeagues: ManagedLeague[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <InlineName
          id={team.id}
          initialValue={team.name}
          action={renameTeamAction}
          ariaLabel={`Editar nombre del equipo ${team.name}`}
        />
        <CategoryBadge category={team.category} />
      </div>
      <p className="text-xs text-zinc-500">
        {team.productCount} {team.productCount === 1 ? 'camiseta asociada' : 'camisetas asociadas'}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ActiveToggle id={team.id} active={team.active} action={toggleTeamActiveAction} />
      </div>
      <div className="flex flex-wrap gap-2">
        <TeamLeaguesPopover team={team} allLeagues={allLeagues} />
        <DeleteTeamForm id={team.id} name={team.name} productCount={team.productCount} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabla + cards de ligas (desktop / mobile)
// ---------------------------------------------------------------------------

function LeaguesTable({ leagues }: { leagues: ManagedLeague[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[44rem] text-sm">
        <caption className="sr-only">Listado de ligas con edicion rapida</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Liga</th>
            <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
            <th scope="col" className="px-4 py-3 font-semibold">Camisetas</th>
            <th scope="col" className="px-4 py-3 font-semibold">Equipos</th>
            <th scope="col" className="px-4 py-3 font-semibold">Activo</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {leagues.map((league) => (
            <LeagueRow key={league.id} league={league} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LeagueRow({ league }: { league: ManagedLeague }) {
  const dimmed = !league.active
  return (
    <tr className={dimmed ? 'bg-zinc-50/60 align-middle hover:bg-zinc-50' : 'align-middle hover:bg-zinc-50/60'}>
      <th scope="row" className="px-4 py-3 text-left font-normal">
        <InlineName
          id={league.id}
          initialValue={league.name}
          action={renameLeagueAction}
          ariaLabel={`Editar nombre de la liga ${league.name}`}
          disabled={dimmed}
        />
      </th>
      <td className="px-4 py-3">
        <CategoryBadge category={league.category} />
      </td>
      <td className="px-4 py-3 text-zinc-700 tabular-nums">
        {league.productCount} {league.productCount === 1 ? 'camiseta' : 'camisetas'}
      </td>
      <td className="px-4 py-3 text-zinc-700 tabular-nums">
        {league.teamCount} {league.teamCount === 1 ? 'equipo' : 'equipos'}
      </td>
      <td className="px-4 py-3">
        <ActiveToggle id={league.id} active={league.active} action={toggleLeagueActiveAction} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <DeleteLeagueForm id={league.id} name={league.name} productCount={league.productCount} />
        </div>
      </td>
    </tr>
  )
}

function LeaguesCards({ leagues }: { leagues: ManagedLeague[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {leagues.map((league) => (
        <li key={league.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
          <LeagueCard league={league} />
        </li>
      ))}
    </ul>
  )
}

function LeagueCard({ league }: { league: ManagedLeague }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <InlineName
          id={league.id}
          initialValue={league.name}
          action={renameLeagueAction}
          ariaLabel={`Editar nombre de la liga ${league.name}`}
        />
        <CategoryBadge category={league.category} />
      </div>
      <p className="text-xs text-zinc-500">
        {league.productCount} {league.productCount === 1 ? 'camiseta' : 'camisetas'} ·{' '}
        {league.teamCount} {league.teamCount === 1 ? 'equipo' : 'equipos'}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ActiveToggle id={league.id} active={league.active} action={toggleLeagueActiveAction} />
      </div>
      <div className="flex flex-wrap gap-2">
        <DeleteLeagueForm id={league.id} name={league.name} productCount={league.productCount} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulario de alta (compartido por equipos y ligas)
// ---------------------------------------------------------------------------

function CreateForm({ kind }: { kind: 'team' | 'league' }) {
  const action = kind === 'team' ? createTeamAction : createLeagueAction
  const nameLabel = kind === 'team' ? 'Nombre del equipo' : 'Nombre de la liga'
  const buttonLabel = kind === 'team' ? 'Crear equipo' : 'Crear liga'
  const nameId = `${kind}-name`
  const categoryId = `${kind}-category`

  return (
    <form action={action} className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-sm font-medium text-zinc-800">
            {nameLabel}
          </label>
          <input
            id={nameId}
            name="name"
            required
            minLength={2}
            placeholder={kind === 'team' ? 'Ej: River Plate' : 'Ej: Liga Profesional'}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-brand-600 focus:outline-2 focus:outline-offset-0 focus:outline-brand-600/40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={categoryId} className="text-sm font-medium text-zinc-800">
            Categoría
          </label>
          <select
            id={categoryId}
            name="category"
            defaultValue="club"
            className="w-full appearance-none rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition focus:border-brand-600 focus:outline-2 focus:outline-offset-0 focus:outline-brand-600/40"
          >
            <option value="seleccion">{categoryLabels.seleccion}</option>
            <option value="club">{categoryLabels.club}</option>
          </select>
        </div>
        <Button type="submit">+ {buttonLabel}</Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Subcomponentes interactivos
// ---------------------------------------------------------------------------

/**
 * Nombre editable inline: click → input → Enter/blur guarda, Escape cancela.
 * Mismo patron que `InlinePrice` (con un `committedRef` para no enviar dos
 * veces si Enter y blur se disparan en cadena al desmontar el input).
 */
function InlineName({
  id,
  initialValue,
  action,
  ariaLabel,
  disabled = false,
}: {
  id: string
  initialValue: string
  action: (formData: FormData) => Promise<void>
  ariaLabel: string
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [isPending, startTransition] = useTransition()
  const committedRef = useRef(false)

  const commit = () => {
    if (committedRef.current) return
    committedRef.current = true
    const next = value.trim()
    if (next && next !== initialValue) {
      const formData = new FormData()
      formData.set('id', id)
      formData.set('name', next)
      startTransition(() => {
        void action(formData)
      })
    }
    setValue(initialValue)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') {
            committedRef.current = true
            setValue(initialValue)
            setEditing(false)
          }
        }}
        aria-label={ariaLabel}
        className="w-full max-w-xs rounded-lg border border-zinc-300 px-2 py-1 text-sm font-semibold text-zinc-900 focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return
        committedRef.current = false
        setValue(initialValue)
        setEditing(true)
      }}
      title={disabled ? undefined : 'Hacer clic para editar el nombre'}
      className={[
        'block w-full max-w-xs truncate rounded-lg px-2 py-1 text-left text-sm font-semibold transition',
        disabled
          ? 'cursor-default text-zinc-500'
          : 'text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
      ].join(' ')}
    >
      {isPending ? '…' : initialValue}
    </button>
  )
}

function CategoryBadge({ category }: { category: ProductCategory }) {
  return (
    <Badge tone={category === 'seleccion' ? 'info' : 'brand'}>{categoryLabels[category]}</Badge>
  )
}

function ActiveToggle({
  id,
  active,
  action,
}: {
  id: string
  active: boolean
  action: (formData: FormData) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Toggle
      checked={active}
      label={active ? 'Activo' : 'Inactivo'}
      disabled={isPending}
      onChange={(checked) => {
        const formData = new FormData()
        formData.set('id', id)
        formData.set('active', String(checked))
        startTransition(() => {
          void action(formData)
        })
      }}
    />
  )
}

/**
 * Boton "Ligas" con popover: checkboxes de las ligas de la MISMA categoria
 * del equipo. Vienen pre-marcadas las asociaciones actuales (`team.leagueIds`).
 * Al guardar se envia `setTeamLeaguesAction(teamId, leagueIds)` con todos los
 * marcados; la accion desactiva los no marcados.
 */
function TeamLeaguesPopover({
  team,
  allLeagues,
}: {
  team: ManagedTeam
  allLeagues: ManagedLeague[]
}) {
  const options = useMemo(
    () => allLeagues.filter((league) => league.category === team.category),
    [allLeagues, team.category],
  )

  const trigger = (
    <Button type="button" variant="outline" size="sm">
      <Network className="size-3.5" aria-hidden /> Ligas
    </Button>
  )

  return (
    <Popover trigger={trigger}>
      <TeamLeaguesForm teamId={team.id} options={options} initialLeagueIds={team.leagueIds} />
    </Popover>
  )
}

function TeamLeaguesForm({
  teamId,
  options,
  initialLeagueIds,
}: {
  teamId: string
  options: ManagedLeague[]
  initialLeagueIds: string[]
}) {
  const [open, setOpen] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialLeagueIds))
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  const toggle = (leagueId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(leagueId)) next.delete(leagueId)
      else next.add(leagueId)
      return next
    })
  }

  const save = () => {
    const formData = new FormData()
    formData.set('id', teamId)
    for (const leagueId of selected) {
      formData.append('leagueIds', leagueId)
    }
    startTransition(() => {
      void setTeamLeaguesAction(formData)
    })
    setOpen(false)
  }

  if (options.length === 0) {
    return (
      <div className="flex w-72 flex-col gap-2 p-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Ligas asociadas
        </p>
        <p className="text-sm text-zinc-500">
          Todavía no hay ligas cargadas en esta categoría. Creá una primero.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
      className="flex w-72 flex-col gap-3 p-2"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Ligas asociadas
      </p>
      <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto" role="group" aria-label="Ligas en esta categoría">
        {options.map((league) => {
          const checked = selected.has(league.id)
          return (
            <li key={league.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  name="leagueIds"
                  value={league.id}
                  checked={checked}
                  onChange={() => toggle(league.id)}
                  className="size-4 shrink-0 rounded border-zinc-300 accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                />
                <span className="min-w-0 truncate">{league.name}</span>
                {checked ? <Check className="ml-auto size-3.5 text-brand-600" aria-hidden /> : null}
              </label>
            </li>
          )
        })}
      </ul>
      <p className="text-[11px] text-zinc-500">
        Las ligas asociadas ya vienen marcadas. Se guardan solo las marcadas; las que desmarques
        dejarán de estar asociadas.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Boton Eliminar con dialogo de confirmacion (patron `DeleteProductForm`):
 * el primer submit abre el modal; el segundo, ya con confirmacion, va a la
 * Server Action. Si el registro tiene camisetas, el dialogo avisa que igual
 * se va a intentar — la accion devolvera `tiene_camisetas` con un banner.
 */
function DeleteTeamForm({ id, name, productCount }: { id: string; name: string; productCount: number }) {
  return <DeleteForm id={id} name={name} productCount={productCount} action={deleteTeamAction} kind="equipo" />
}

function DeleteLeagueForm({ id, name, productCount }: { id: string; name: string; productCount: number }) {
  return <DeleteForm id={id} name={name} productCount={productCount} action={deleteLeagueAction} kind="liga" />
}

function DeleteForm({
  id,
  name,
  productCount,
  action,
  kind,
}: {
  id: string
  name: string
  productCount: number
  action: (formData: FormData) => Promise<void>
  kind: 'equipo' | 'liga'
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const confirmedRef = useRef(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const hasProducts = productCount > 0
  const subject = kind === 'equipo' ? `el equipo "${name}"` : `la liga "${name}"`
  const warning = hasProducts
    ? ` Igual tiene ${productCount} ${
        productCount === 1 ? 'camiseta' : 'camisetas'
      } activas, así que la acción va a fallar y te mostraremos cómo seguir.`
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
          <Trash2 className="size-3.5" aria-hidden /> Eliminar
        </Button>
      </form>
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          confirmedRef.current = true
          formRef.current?.requestSubmit()
        }}
        title="Eliminar"
        message={`Vas a enviar ${subject} a la papelera.${warning} Después podés restaurarlo desde Eliminados.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Helpers chicos
// ---------------------------------------------------------------------------

function TabLink({
  href,
  active,
  count,
  children,
}: {
  href: string
  active: boolean
  count: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={[
        'inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition',
        active
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
      ].join(' ')}
    >
      {children}
      <span
        className={[
          'inline-flex min-w-5 justify-center rounded-full px-1.5 text-[11px] font-bold',
          active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600',
        ].join(' ')}
      >
        {count}
      </span>
    </Link>
  )
}

function SearchInput({
  value,
  onChange,
  className = '',
}: {
  value: string
  onChange: (next: string) => void
  className?: string
}) {
  return (
    <div className={['relative', className].filter(Boolean).join(' ')}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por nombre…"
        aria-label="Buscar equipos o ligas por nombre"
        className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pr-4 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
      />
    </div>
  )
}

function EmptyHint({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center">
      <p className="text-sm font-bold uppercase tracking-tight text-zinc-950">{title}</p>
      <p className="max-w-sm text-sm text-zinc-500">{description}</p>
    </div>
  )
}

/**
 * Empty state cuando el filtro/buscador deja la lista en cero pero la fuente
 * original SI tiene registros. Mismo lenguaje visual que `EmptyHint` (dashed
 * border, mayusculas tracking-tight) para mantener consistencia con la
 * papelera y el inventario.
 */
function NoMatchesHint({
  kind,
  hasActiveFilter,
}: {
  kind: 'equipos' | 'ligas'
  hasActiveFilter: boolean
}) {
  const hint = hasActiveFilter
    ? `Probá con otro término de búsqueda o cambiá el filtro de categoría${
        kind === 'ligas' ? ' para ver más ligas' : ' para ver más equipos'
      }.`
    : `Probá con otro término de búsqueda para ver más ${
        kind === 'ligas' ? 'ligas' : 'equipos'
      }.`
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center">
      <p className="text-sm font-bold uppercase tracking-tight text-zinc-950">
        Ningún resultado coincide
      </p>
      <p className="max-w-sm text-sm text-zinc-500">{hint}</p>
    </div>
  )
}

/**
 * Segmented control "Todos / Selecciones / Clubes" para filtrar la lista por
 * categoria. Mismo lenguaje visual que el tablist superior (border + bg-white +
 * p-1) pero con pills `rounded-full` para distinguirlo como filtro (no como
 * switcher de vistas). Aplica a la pestaña activa: el state vive en
 * `TaxonomyClient` y se hereda entre Equipos y Ligas porque comparten el
 * campo `category`.
 */
function CategoryFilterControl({
  value,
  onChange,
}: {
  value: CategoryFilter
  onChange: (next: CategoryFilter) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        id="category-filter-label"
        className="hidden text-xs font-bold uppercase tracking-wide text-zinc-500 sm:inline"
      >
        Categoría
      </span>
      <div
        role="radiogroup"
        aria-labelledby="category-filter-label"
        className="inline-flex shrink-0 rounded-full border border-zinc-200 bg-white p-1"
      >
        {CATEGORY_FILTER_OPTIONS.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={[
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              ].join(' ')}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Filtro en memoria por needle normalizado (sin tildes, lowercase). */
function useFilter<T>(items: T[], query: string, getHaystack: (item: T) => string): T[] {
  return useMemo(() => {
    const needle = normalize(query.trim())
    if (!needle) return items
    return items.filter((item) => normalize(getHaystack(item)).includes(needle))
  }, [items, query, getHaystack])
}

/** Filtra por categoria; 'all' deja pasar todo. */
function applyCategoryFilter<T extends { category: ProductCategory }>(
  items: T[],
  filter: CategoryFilter,
): T[] {
  if (filter === 'all') return items
  return items.filter((item) => item.category === filter)
}
