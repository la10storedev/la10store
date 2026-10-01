'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { categoryLabels, SORT_LABELS } from '@/lib/products'
import type {
  ProductCategory,
  ProductFacets,
  ProductFilters,
  SortOrder,
} from '@/types/product'

/**
 * Suscripcion "trampa" para `useSyncExternalStore`: nunca notifica cambios y
 * devuelve `true` en cliente / `false` en servidor. Es el patron recomendado
 * por React para detectar "estoy en el browser" sin disparar un render
 * adicional (la alternativa `useState(false) + useEffect(setMounted(true))`
 * cae en el lint rule `react-hooks/set-state-in-effect`). Los snapshots
 * diferentes entre servidor y cliente son el caso de uso documentado: React
 * usa el snapshot del servidor durante el render y el del cliente despues
 * de la hidratacion, sin marcar mismatch.
 */
const subscribeNoop = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

type ProductFiltersProps = {
  facets: ProductFacets
  /** Filtros activos (vienen del servidor, leidos de la URL). */
  filters: ProductFilters
}

/**
 * Estado borrador del modal: copia plana y editable de los filtros + orden.
 * Es exactamente lo que va a escribirse en la URL al presionar "Aplicar".
 */
type Draft = {
  category: string
  league: string
  team: string
  size: string
  stock: string
  sort: SortOrder
}

/** Selector de elementos enfocables dentro del modal (focus inicial + focus trap). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Opciones del grupo Stock (incluye "Todos" como valor vacio). */
const STOCK_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'disponible', label: 'Con stock' },
  { value: 'encargo', label: 'Encargo' },
]

/** Crea un draft vacio (sin filtros, orden por defecto). */
function emptyDraft(): Draft {
  return {
    category: '',
    league: '',
    team: '',
    size: '',
    stock: '',
    sort: 'destacados',
  }
}

/**
 * Filtros del catalogo.
 *
 * El filtrado ocurre del lado del servidor a partir de la query string: la URL
 * es compartible y el resultado funciona sin JS para leerlo. Este componente
 * solo escribe en la URL con `router.replace(..., { scroll: false })`.
 *
 * Es un UNICO modal centralizado que reune filtros + ordenamiento con estado
 * borrador (draft). El usuario selecciona opciones libremente y al presionar
 * "Aplicar" se escribe TODO en la URL de una sola vez; recien ahi el servidor
 * re-renderiza con los nuevos search params. Cancelar / cerrar descarta el
 * borrador y no navega.
 *
 * El buscador `q` (con debounce) queda fuera del modal, arriba, intacto.
 *
 * Por usar `useSearchParams` debe ir dentro de un `<Suspense>` (la pagina de
 * catalogo ya lo envuelve).
 *
 * --- Portal a document.body ---
 * El modal se portaliza para escapar el stacking context del `<section
 * className="isolate">` del Hero. Sin portal, el Hero completo (con su
 * contenido adentro, incluido el modal) se apila como unidad contra las
 * secciones siguientes (grilla de productos, etc.) y las tarjetas tapan el
 * overlay, sin importar el z-index interno. Portalizarlo a `document.body`
 * lo pone en el stacking context raiz, donde compite directamente con el
 * Navbar sticky (`z-50`) y el resto de la pagina: por eso el overlay usa
 * `z-[100]`, claramente por encima.
 *
 * Patron safe para SSR: `useSyncExternalStore` con snapshot servidor `false`
 * y snapshot cliente `true`. Asi el HTML del servidor y el del primer render
 * del cliente coinciden (modal cerrado -> nada portalizado), evitando
 * warnings de hidratacion. El portal solo aparece una vez montado Y con el
 * modal abierto. Esta implementacion es la recomendada por React y evita el
 * render en cascada que generaria `useState(false) + useEffect(setMounted)`.
 */
export function ProductFilters({ facets, filters }: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // -------------------- Buscador (debounced, sin cambios) --------------------
  const urlQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)

  // Sincroniza el input cuando cambia la URL (atras/adelante, "limpiar filtros").
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    setQuery(urlQuery)
  }

  const paramsKey = searchParams.toString()

  /** Escribe cambios en la URL preservando el resto de filtros. */
  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(paramsKey)
      for (const [key, value] of Object.entries(patch)) {
        if (!value) params.delete(key)
        else params.set(key, value)
      }
      const next = params.toString()
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
    },
    [paramsKey, pathname, router],
  )

  useEffect(() => {
    if (query === urlQuery) return
    const timer = setTimeout(() => update({ q: query || undefined }), 400)
    return () => clearTimeout(timer)
  }, [query, urlQuery, update])

  // -------------------- Helpers de taxonomia --------------------
  const leaguesFor = useCallback(
    (category: string | undefined): string[] => {
      return category
        ? (facets.leaguesByCategory[category as ProductCategory] ?? [])
        : facets.leagues
    },
    [facets],
  )
  const teamsFor = useCallback(
    (category: string | undefined): string[] => {
      return category
        ? (facets.teamsByCategory[category as ProductCategory] ?? [])
        : facets.teams
    },
    [facets],
  )

  // -------------------- Modal: apertura, cierre y refs --------------------
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()

  // Flag de montaje client-side (ver doc del componente).
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot)

  /**
   * Snapshot editable de los filtros activos. Se inicializa vacio y se siembra
   * desde `filters` cada vez que el modal se abre; los handlers solo mutan el
   * draft (jamás la URL).
   */
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  /** Abre el modal re-sincronizando el draft desde la URL actual. */
  const openModal = useCallback(() => {
    setDraft({
      category: filters.category ?? '',
      league: filters.league ?? '',
      team: filters.team ?? '',
      size: filters.size ?? '',
      stock: filters.stock ?? '',
      sort: filters.sort ?? 'destacados',
    })
    setOpen(true)
  }, [filters])

  /** Cierra el modal descartando el draft (no toca la URL). */
  const closeModal = useCallback(() => setOpen(false), [])

  /**
   * Opciones del select de Liga considerando el DRAFT.
   *
   * Cascada:
   * 1. Si hay `draft.team` Y conocemos sus ligas via asociaciones (`teamLeagues`
   *    existe y tiene al menos una entrada), usamos esas ligas. La idea: si
   *    el usuario eligio un equipo, el dropdown de ligas se reduce a las ligas
   *    reales en las que ese equipo juega.
   * 2. Si no hay equipo, o las asociaciones son desconocidas / vacias, caemos
   *    al listado completo por categoria (`leaguesFor`).
   *
   * En ambos casos: si `draft.league` no esta en la lista derivada (llego por
   * URL o quedo pendiente de limpieza), lo agregamos al final para que el
   * select lo siga mostrando sin perder la seleccion del usuario.
   */
  const draftLeagueOptions = useMemo(() => {
    if (draft.team) {
      const known = facets.associations.teamLeagues[draft.team]
      if (known && known.length > 0) {
        return draft.league && !known.includes(draft.league) ? [...known, draft.league] : known
      }
    }
    const base = leaguesFor(draft.category || undefined)
    return draft.league && !base.includes(draft.league) ? [...base, draft.league] : base
  }, [draft.category, draft.team, draft.league, facets.associations, leaguesFor])

  /**
   * Opciones del select de Equipo considerando el DRAFT.
   *
   * Simetrico a `draftLeagueOptions`: si hay `draft.league` con asociaciones
   * conocidas, usamos `leagueTeams[draft.league]`; si no, fallback a `teamsFor`.
   * `draft.team` se conserva siempre que no este en la lista derivada.
   */
  const draftTeamOptions = useMemo(() => {
    if (draft.league) {
      const known = facets.associations.leagueTeams[draft.league]
      if (known && known.length > 0) {
        return draft.team && !known.includes(draft.team) ? [...known, draft.team] : known
      }
    }
    const base = teamsFor(draft.category || undefined)
    return draft.team && !base.includes(draft.team) ? [...base, draft.team] : base
  }, [draft.category, draft.league, draft.team, facets.associations, teamsFor])

  /** Cantidad de selecciones activas en el draft (para el badge del boton Aplicar). */
  const draftCount = useMemo(() => {
    let count = 0
    if (draft.category) count++
    if (draft.league) count++
    if (draft.team) count++
    if (draft.size) count++
    if (draft.stock) count++
    if (draft.sort !== 'destacados') count++
    return count
  }, [draft])

  /**
   * Actualiza un campo del draft con limpieza cruzada cuando corresponde.
   *
   * - `category`: si la Liga/Equipo actuales no estan en la lista de la nueva
   *   categoria, se limpian (regla existente, intacta).
   * - `league`: si el Equipo actual no pertenece a la nueva liga y la asociacion
   *   de esa liga es CONOCIDA (existe y no esta vacia), limpiamos Equipo.
   *   Si no hay asociacion (clave inexistente o array vacio), no limpiamos:
   *   el select de Equipo mostrara la lista completa como fallback.
   * - `team`: simetrico para Liga.
   *
   * Nota: borrar Liga o Equipo (value = '') nunca limpia el otro lado: es
   * una operacion de "suelto el filtro", no de "elijo uno incompatible".
   */
  const setDraftField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => {
      const next: Draft = { ...prev, [key]: value }
      if (key === 'category') {
        const newCategory = value as string
        if (next.league && !leaguesFor(newCategory || undefined).includes(next.league)) {
          next.league = ''
        }
        if (next.team && !teamsFor(newCategory || undefined).includes(next.team)) {
          next.team = ''
        }
      }
      if (key === 'league') {
        const newLeague = value as string
        if (newLeague && next.team) {
          const teamsForLeague = facets.associations.leagueTeams[newLeague]
          if (teamsForLeague && teamsForLeague.length > 0 && !teamsForLeague.includes(next.team)) {
            next.team = ''
          }
        }
      }
      if (key === 'team') {
        const newTeam = value as string
        if (newTeam && next.league) {
          const leaguesForTeam = facets.associations.teamLeagues[newTeam]
          if (leaguesForTeam && leaguesForTeam.length > 0 && !leaguesForTeam.includes(next.league)) {
            next.league = ''
          }
        }
      }
      return next
    })
  }

  /** Resetea el draft a vacio (aun no se aplica hasta pulsar "Aplicar"). */
  const resetDraft = () => setDraft(emptyDraft())

  /**
   * Compara el draft contra los filtros vigentes en la URL y produce un patch
   * minimo con solo lo que cambia. Si nada cambia, simplemente cierra.
   */
  const applyDraft = () => {
    const patch: Record<string, string | undefined> = {}
    const currentCategory = filters.category ?? ''
    const currentLeague = filters.league ?? ''
    const currentTeam = filters.team ?? ''
    const currentSize = filters.size ?? ''
    const currentStock = filters.stock ?? ''
    const currentSort: SortOrder = filters.sort ?? 'destacados'

    if (draft.category !== currentCategory) patch.category = draft.category || undefined
    if (draft.league !== currentLeague) patch.league = draft.league || undefined
    if (draft.team !== currentTeam) patch.team = draft.team || undefined
    if (draft.size !== currentSize) patch.size = draft.size || undefined
    if (draft.stock !== currentStock) patch.stock = draft.stock || undefined
    if (draft.sort !== currentSort) {
      patch.sort = draft.sort === 'destacados' ? undefined : draft.sort
    }

    if (Object.keys(patch).length > 0) update(patch)
    closeModal()
  }

  // -------------------- Efectos del modal: Escape, scroll lock, foco --------------------
  useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
        return
      }
      // Focus trap simple: Tab / Shift+Tab cicla dentro del modal.
      if (event.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (event.shiftKey && (active === first || !modalRef.current.contains(active))) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, closeModal])

  // Foco inicial al abrir; restauracion al trigger al cerrar.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      const first = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      first?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (open) return
    // Solo devolvemos foco al trigger cuando el modal pasa de abierto -> cerrado.
    triggerRef.current?.focus()
  }, [open])

  // -------------------- Estado activo derivado de la URL (no del draft) --------------------
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.category) count++
    if (filters.league) count++
    if (filters.team) count++
    if (filters.size) count++
    if (filters.stock) count++
    return count
  }, [filters])

  const hasFilters = activeFilterCount > 0 || Boolean(filters.q)
  const currentSort: SortOrder = filters.sort ?? 'destacados'
  const sortLabel = SORT_LABELS[currentSort]
  const sortIsCustom = currentSort !== 'destacados'

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="bg-transparent">
      <div className="flex flex-col gap-4">
        {/* Buscador libre: transparente, texto blanco, borde blanco. Sigue FUERA
            del modal para que el usuario pueda refinar la busqueda sin abrirlo. */}
        <label className="flex w-full items-center gap-2 border-b border-white/40 pb-2 focus-within:border-white">
          <svg
            viewBox="0 0 20 20"
            className="size-5 shrink-0 text-white/70"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar equipo, liga o temporada"
            className="w-full bg-transparent text-base font-medium text-white placeholder:text-white/50 focus:outline-none"
          />
        </label>

        {/* Trigger unico del modal. */}
        <div className="flex items-center gap-4">
          <button
            ref={triggerRef}
            type="button"
            onClick={openModal}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? 'filters-modal' : undefined}
            className={[
              'flex items-center gap-2 border-b pb-1.5 pt-1 text-left transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white',
              activeFilterCount > 0
                ? 'border-white text-white'
                : 'border-white/40 text-white/80 hover:border-white',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <path d="M2 4h12M4 8h8M6 12h4" strokeLinecap="round" />
            </svg>
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
              Filtros y ordenar
              {activeFilterCount > 0 ? (
                <span
                  aria-label={`${activeFilterCount} filtros activos`}
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold leading-none text-zinc-900"
                >
                  {activeFilterCount}
                </span>
              ) : null}
            </span>
            {sortIsCustom ? (
              <span className="hidden truncate text-xs font-medium text-white/70 sm:inline">
                · {sortLabel}
              </span>
            ) : null}
          </button>
        </div>

        {/* Chips de filtros activos: reflejan la URL (no el draft). El chip de
            sort aparece ahora que el orden vive dentro del mismo modal. */}
        {hasFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            {filters.category ? (
              <FilterChip
                label={
                  categoryLabels[filters.category as keyof typeof categoryLabels] ??
                  filters.category
                }
                onRemove={() => update({ category: undefined })}
              />
            ) : null}
            {filters.league ? (
              <FilterChip
                label={filters.league}
                onRemove={() => update({ league: undefined })}
              />
            ) : null}
            {filters.team ? (
              <FilterChip
                label={filters.team}
                onRemove={() => update({ team: undefined })}
              />
            ) : null}
            {filters.size ? (
              <FilterChip
                label={`Talle ${filters.size}`}
                onRemove={() => update({ size: undefined })}
              />
            ) : null}
            {filters.stock === 'encargo' || filters.stock === 'agotado' ? (
              <FilterChip
                label="Encargo"
                onRemove={() => update({ stock: undefined })}
              />
            ) : null}
            {filters.stock === 'disponible' ? (
              <FilterChip
                label="Con stock"
                onRemove={() => update({ stock: undefined })}
              />
            ) : null}
            {filters.q ? (
              <FilterChip
                label={`"${filters.q}"`}
                onRemove={() => update({ q: undefined })}
              />
            ) : null}
            {sortIsCustom ? (
              <FilterChip label={sortLabel} onRemove={() => update({ sort: undefined })} />
            ) : null}

            <button
              type="button"
              onClick={() => {
                setQuery('')
                router.replace(pathname, { scroll: false })
              }}
              className="ml-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-700 underline underline-offset-4 transition-colors hover:text-zinc-950"
            >
              Limpiar
            </button>
          </div>
        ) : null}
      </div>

      {/* -------------------- Modal unificado (portalizado a document.body) -------------------- */}
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/60 p-0 backdrop-blur-sm animate-overlay-in sm:flex sm:items-center sm:p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeModal()
              }}
            >
              <div
                ref={modalRef}
                id="filters-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                className="flex w-full max-h-[92vh] flex-col bg-white shadow-2xl animate-sheet-in rounded-t-2xl sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl sm:animate-confirm-in"
              >
                {/* Indicador de "drag" en mobile (puramente visual, sin handler). */}
                <div
                  aria-hidden
                  className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-200 sm:hidden"
                />

                {/* Cabecera */}
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 sm:px-6">
                  <div>
                    <h2
                      id={titleId}
                      className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-950"
                    >
                      Filtros y ordenar
                    </h2>
                    <p id={descId} className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Ajusta las opciones y presiona{' '}
                      <strong className="font-semibold text-zinc-700">Aplicar</strong> para
                      actualizar los resultados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Cerrar filtros"
                    className="-mr-2 inline-flex shrink-0 items-center justify-center p-2 text-zinc-400 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* Cuerpo scrolleable: grilla 2-col en desktop, 1-col en mobile.
                    Tipo y Ordenar ocupan todo el ancho; los filtros restantes
                    se acomodan en 2 columnas para ahorrar alto y entrada. */}
                <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                  <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2">
                    <FilterSegmented
                      name="category"
                      label="Tipo"
                      value={draft.category}
                      options={[
                        { value: '', label: 'Todos' },
                        ...facets.categories.map((category) => ({
                          value: category,
                          label: categoryLabels[category],
                        })),
                      ]}
                      onChange={(value) => setDraftField('category', value)}
                      className="sm:col-span-2"
                    />

                    <FilterSelect
                      name="league"
                      label="Liga"
                      value={draft.league}
                      options={[
                        { value: '', label: 'Todas' },
                        ...draftLeagueOptions.map((league) => ({
                          value: league,
                          label: league,
                        })),
                      ]}
                      onChange={(value) => setDraftField('league', value)}
                      hint={
                        draft.team && (facets.associations.teamLeagues[draft.team]?.length ?? 0) > 0
                          ? 'Filtrado por el equipo elegido'
                          : undefined
                      }
                    />

                    <FilterSelect
                      name="team"
                      label="Equipo"
                      value={draft.team}
                      options={[
                        { value: '', label: 'Todos' },
                        ...draftTeamOptions.map((team) => ({ value: team, label: team })),
                      ]}
                      onChange={(value) => setDraftField('team', value)}
                      hint={
                        draft.league && (facets.associations.leagueTeams[draft.league]?.length ?? 0) > 0
                          ? 'Filtrado por la liga elegida'
                          : undefined
                      }
                    />

                    <FilterSelect
                      name="size"
                      label="Talle"
                      value={draft.size}
                      options={[
                        { value: '', label: 'Todos' },
                        ...facets.sizes.map((size) => ({ value: size, label: size })),
                      ]}
                      onChange={(value) => setDraftField('size', value)}
                    />

                    <FilterSelect
                      name="stock"
                      label="Stock"
                      value={draft.stock}
                      options={STOCK_OPTIONS}
                      onChange={(value) => setDraftField('stock', value)}
                    />

                    <FilterSelect
                      name="sort"
                      label="Ordenar por"
                      value={draft.sort}
                      options={(Object.keys(SORT_LABELS) as SortOrder[]).map((order) => ({
                        value: order,
                        label: SORT_LABELS[order],
                      }))}
                      onChange={(value) => setDraftField('sort', value as SortOrder)}
                      className="sm:col-span-2"
                    />
                  </div>
                </div>

                {/* Footer con acciones */}
                <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                  <button
                    type="button"
                    onClick={resetDraft}
                    disabled={draftCount === 0}
                    className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-500"
                  >
                    Limpiar todo
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex flex-1 items-center justify-center border border-zinc-300 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-950 transition-colors duration-150 hover:border-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:flex-none"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={applyDraft}
                      className="inline-flex flex-1 items-center justify-center gap-2 bg-brand-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:flex-none"
                    >
                      Aplicar
                      {draftCount > 0 ? (
                        <span
                          aria-hidden
                          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold leading-none text-brand-700"
                        >
                          {draftCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Control segmentado: 2-3 opciones mutuamente excluyentes dispuestas en fila,
 * con la opcion activa resaltada por fondo blanco + sombra + texto brand.
 * Pensado para "Tipo": 2 categorias + "Todos" se ven compactos y claros.
 * Conserva semantica de `radiogroup` (a11y) por mas que sea horizontal.
 */
function FilterSegmented({
  name,
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  const groupId = `${name}-group`
  return (
    <div className={className}>
      <div
        id={groupId}
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400"
      >
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="flex w-full rounded-xl border border-zinc-200 bg-zinc-100 p-1"
      >
        {options.map((option) => {
          const isSelected = option.value === value
          return (
            <button
              key={option.value || `__all__${name}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={[
                'flex-1 rounded-lg px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                isSelected
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950',
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

/**
 * Select nativo estilizado para filtros con varias opciones (Liga, Equipo,
 * Talle, Stock, Ordenar). Label arriba del control; altura ~48px con texto
 * base para mantener legibilidad y evitar el zoom automatico de iOS sobre
 * inputs < 16px. Chevron decorativo a la derecha (el nativo se oculta con
 * `appearance-none`). Coherente con el lenguaje del proyecto: borde zinc-300,
 * foco brand, transicion corta. Si el valor del draft no esta entre las
 * opciones (llego por URL), lo agrega el caller antes de pasar `options`.
 *
 * `hint` (opcional): texto explicativo sutil que aparece entre el label y el
 * select, pensado para avisarle al usuario por que la lista se ve reducida
 * (p. ej. "Filtrado por la liga elegida" cuando el select de Equipo esta
 * cascada por una Liga activa). El slot reserva altura fija aunque no haya
 * hint, asi las dos columnas de la grilla 2-col mantienen el mismo alto.
 */
function FilterSelect({
  name,
  label,
  value,
  options,
  onChange,
  className = '',
  hint,
}: {
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
  hint?: string
}) {
  const id = `${name}-select`
  return (
    <div className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      <label
        htmlFor={id}
        className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400"
      >
        {label}
      </label>
      {/* Slot de hint con altura reservada: aunque no haya hint, ocupa ~12px
          para que las dos columnas de la grilla queden alineadas cuando solo
          uno de los selects esta filtrado. `aria-live="polite"` anuncia el
          cambio cuando la cascada reduce la lista del otro select. */}
      <div className="min-h-3" aria-live="polite">
        {hint ? <p className="text-[10px] text-zinc-500">{hint}</p> : null}
      </div>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none rounded-xl border border-zinc-300 bg-white px-4 pr-10 text-base font-medium text-zinc-900 transition focus:border-brand-600 focus:outline-2 focus:outline-offset-0 focus:outline-brand-600/40"
        >
          {options.map((option) => (
            <option key={option.value || `__all__${name}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
        >
          <svg
            viewBox="0 0 12 12"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  )
}

/**
 * Chip removible de filtro activo. Se conserva tal cual el lenguaje visual
 * del catalogo: pastilla naranja brand con X para quitar.
 */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 bg-brand-600 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      {label}
      <span aria-hidden>&times;</span>
      <span className="sr-only">Quitar filtro</span>
    </button>
  )
}
