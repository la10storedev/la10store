'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { categoryLabels, SORT_LABELS } from '@/lib/products'
import type {
  ProductCategory,
  ProductFacets,
  ProductFilters,
  SortOrder,
} from '@/types/product'

type ProductFiltersProps = {
  facets: ProductFacets
  /** Filtros activos (vienen del servidor, leídos de la URL). */
  filters: ProductFilters
}

/** Panel abierto. `null` = ambos cerrados. Las dos keys son mutuamente excluyentes. */
type PanelKey = 'filters' | 'sort'

/** Selector de elementos enfocables dentro del panel (para mover el foco al abrir). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Filtros del catálogo.
 *
 * El filtrado ocurre del lado del servidor a partir de la query string: la URL
 * es compartible y el resultado funciona sin JS para leerlo. Este componente
 * sólo escribe en la URL con `router.replace(..., { scroll: false })`.
 *
 * Antes: 6 `<select>` siempre visibles en una grilla.
 * Ahora: dos botones — "Filtros" y "Ordenar" — que abren paneles emergentes
 *   (popover en desktop, bottom sheet en mobile). Las chips de filtros activos
 *   siguen visibles debajo, para que el usuario vea siempre lo que está
 *   aplicado sin tener que reabrir el panel.
 *
 * Por usar `useSearchParams` debe ir dentro de un `<Suspense>` (la página de
 * catálogo ya lo envuelve).
 */
export function ProductFilters({ facets, filters }: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // -------------------- Buscador (debounced, sin cambios) --------------------
  const urlQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)

  // Sincroniza el input cuando cambia la URL (atrás/adelante, "limpiar filtros").
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

  // -------------------- Helpers de taxonomía --------------------
  function leaguesFor(category: string | undefined): string[] {
    return category
      ? (facets.leaguesByCategory[category as ProductCategory] ?? [])
      : facets.leagues
  }
  function teamsFor(category: string | undefined): string[] {
    return category
      ? (facets.teamsByCategory[category as ProductCategory] ?? [])
      : facets.teams
  }

  const leagueOptions = leaguesFor(filters.category)
  const teamOptions = teamsFor(filters.category)
  // Si el valor activo no está en la lista del Tipo actual, se agrega igual
  // para no perder una selección llegada por URL.
  const displayedLeagues =
    filters.league && !leagueOptions.includes(filters.league)
      ? [...leagueOptions, filters.league]
      : leagueOptions
  const displayedTeams =
    filters.team && !teamOptions.includes(filters.team)
      ? [...teamOptions, filters.team]
      : teamOptions

  // -------------------- Estado del panel emergente --------------------
  // Una sola pieza de estado asegura que los dos paneles son mutuamente
  // excluyentes sin lógica extra: abrir uno cierra el otro automáticamente.
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null)
  const filtersContainerRef = useRef<HTMLDivElement>(null)
  const sortContainerRef = useRef<HTMLDivElement>(null)
  const filtersPanelRef = useRef<HTMLDivElement>(null)
  const sortPanelRef = useRef<HTMLDivElement>(null)
  const filtersTriggerRef = useRef<HTMLButtonElement>(null)
  const sortTriggerRef = useRef<HTMLButtonElement>(null)
  /** Para devolver el foco al trigger que abrió el panel actual. */
  const previousOpenRef = useRef<PanelKey | null>(null)

  const filtersPanelId = useId()
  const sortPanelId = useId()

  /** Abre/cierra el panel y guarda el trigger para restaurar el foco al cerrar. */
  const togglePanel = useCallback((key: PanelKey, trigger: HTMLElement) => {
    setOpenPanel((current) => {
      if (current === key) return null
      if (key === 'filters') filtersTriggerRef.current = trigger as HTMLButtonElement
      else sortTriggerRef.current = trigger as HTMLButtonElement
      return key
    })
  }, [])

  const closePanel = useCallback(() => setOpenPanel(null), [])

  /** Cantidad de filtros activos (sin contar el ordenamiento). */
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

  // -------------------- Cierre por click afuera / Escape --------------------
  useEffect(() => {
    if (openPanel === null) return
    const handlePointer = (event: PointerEvent) => {
      const container =
        openPanel === 'filters' ? filtersContainerRef.current : sortContainerRef.current
      if (container && !container.contains(event.target as Node)) {
        setOpenPanel(null)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPanel(null)
      }
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openPanel])

  // Devolver foco al trigger cuando el panel pasa de abierto a cerrado.
  useEffect(() => {
    const wasOpen = previousOpenRef.current
    previousOpenRef.current = openPanel
    if (wasOpen !== null && openPanel === null) {
      const trigger =
        wasOpen === 'filters' ? filtersTriggerRef.current : sortTriggerRef.current
      trigger?.focus()
    }
  }, [openPanel])

  // Mover el foco al primer elemento del panel al abrir.
  useEffect(() => {
    if (openPanel === null) return
    const panel =
      openPanel === 'filters' ? filtersPanelRef.current : sortPanelRef.current
    if (!panel) return
    const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    first?.focus()
  }, [openPanel])

  const currentSort: SortOrder = filters.sort ?? 'destacados'
  const sortLabel = SORT_LABELS[currentSort]

  // -------------------- Handlers de cada radio group --------------------
  const onCategoryChange = (value: string) => {
    const patch: Record<string, string | undefined> = {
      category: value || undefined,
    }
    // Al cambiar el Tipo se quitan liga/equipo que no correspondan.
    if (filters.league && !leaguesFor(value || undefined).includes(filters.league)) {
      patch.league = undefined
    }
    if (filters.team && !teamsFor(value || undefined).includes(filters.team)) {
      patch.team = undefined
    }
    update(patch)
  }
  const onLeagueChange = (value: string) => update({ league: value || undefined })
  const onTeamChange = (value: string) => update({ team: value || undefined })
  const onSizeChange = (value: string) => update({ size: value || undefined })
  const onStockChange = (value: string) => update({ stock: value || undefined })
  // El panel de Ordenar se cierra al elegir (es single-choice).
  const onSortChange = (value: string) => {
    update({ sort: value as SortOrder })
    closePanel()
  }

  return (
    <div className="border-y border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10">
        {/* Buscador libre (descubrimiento primario, se mantiene siempre visible). */}
        <label className="flex w-full items-center gap-2 border-b border-zinc-300 pb-1.5 focus-within:border-zinc-950">
          <svg
            viewBox="0 0 20 20"
            className="size-4 shrink-0 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
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
            className="w-full bg-transparent text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
          />
        </label>

        {/* Botones Filtros + Ordenar (stacked en mobile, side-by-side en desktop). */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-8">
          {/* -------------------- Filtros -------------------- */}
          <div ref={filtersContainerRef} className="relative sm:w-[22rem]">
            <button
              ref={filtersTriggerRef}
              type="button"
              onClick={(event) => togglePanel('filters', event.currentTarget)}
              aria-haspopup="dialog"
              aria-expanded={openPanel === 'filters'}
              aria-controls={filtersPanelId}
              className={[
                'flex w-full items-center justify-between gap-3 border-b pb-1.5 pt-1 text-left transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600',
                activeFilterCount > 0
                  ? 'border-brand-600 text-brand-700'
                  : 'border-zinc-300 text-zinc-950 hover:border-zinc-950',
              ].join(' ')}
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                Filtros
                {activeFilterCount > 0 ? (
                  <span
                    aria-label={`${activeFilterCount} filtros activos`}
                    className="inline-flex h-[18px] min-w-[18px] items-center justify-center bg-brand-600 px-1.5 text-[10px] font-bold leading-none text-white"
                  >
                    {activeFilterCount}
                  </span>
                ) : null}
              </span>
              <ChevronIcon open={openPanel === 'filters'} />
            </button>

            {/* Panel Filtros: siempre montado (anima con data-state, cerrado = inert). */}
            <div
              ref={filtersPanelRef}
              id={filtersPanelId}
              role="dialog"
              aria-labelledby={`${filtersPanelId}-title`}
              inert={openPanel !== 'filters'}
              data-state={openPanel === 'filters' ? 'open' : 'closed'}
              className={[
                'z-50 max-h-[85vh] overflow-hidden border-zinc-200 bg-white shadow-2xl transition-all duration-200 ease-out',
                // Mobile: bottom sheet
                'fixed inset-x-0 bottom-0 rounded-t-2xl border-t',
                'data-[state=closed]:pointer-events-none data-[state=closed]:translate-y-4 data-[state=closed]:opacity-0',
                'data-[state=open]:translate-y-0 data-[state=open]:opacity-100',
                // Desktop: popover anclado al botón
                'sm:absolute sm:inset-auto sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:max-h-[70vh] sm:w-full sm:rounded-none sm:border sm:shadow-lg',
                'sm:data-[state=closed]:-translate-y-1',
              ].join(' ')}
            >
              <PanelHeader
                id={`${filtersPanelId}-title`}
                title="Filtros"
                onClose={closePanel}
              />

              {/* Cuerpo scrolleable con los 5 grupos. */}
              <div className="max-h-[calc(85vh-7rem)] overflow-y-auto px-4 py-4 sm:max-h-[calc(70vh-7rem)] sm:px-5 sm:py-5">
                <FilterRadioGroup
                  name="category"
                  label="Tipo"
                  value={filters.category ?? ''}
                  options={[
                    { value: '', label: 'Todos' },
                    ...facets.categories.map((category) => ({
                      value: category,
                      label: categoryLabels[category],
                    })),
                  ]}
                  onChange={onCategoryChange}
                />

                <FilterRadioGroup
                  name="league"
                  label="Liga"
                  value={filters.league ?? ''}
                  options={[
                    { value: '', label: 'Todas' },
                    ...displayedLeagues.map((league) => ({ value: league, label: league })),
                  ]}
                  onChange={onLeagueChange}
                />

                <FilterRadioGroup
                  name="team"
                  label="Equipo"
                  value={filters.team ?? ''}
                  options={[
                    { value: '', label: 'Todos' },
                    ...displayedTeams.map((team) => ({ value: team, label: team })),
                  ]}
                  onChange={onTeamChange}
                />

                <FilterRadioGroup
                  name="size"
                  label="Talle"
                  value={filters.size ?? ''}
                  options={[
                    { value: '', label: 'Todos' },
                    ...facets.sizes.map((size) => ({ value: size, label: size })),
                  ]}
                  onChange={onSizeChange}
                />

                <FilterRadioGroup
                  name="stock"
                  label="Stock"
                  value={filters.stock ?? ''}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'disponible', label: 'Con stock' },
                    { value: 'encargo', label: 'Encargo' },
                  ]}
                  onChange={onStockChange}
                />
              </div>

              <PanelFooter>
                <span className="hidden text-[10px] uppercase tracking-[0.12em] text-zinc-400 sm:inline">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} filtro${activeFilterCount === 1 ? '' : 's'} aplicado${activeFilterCount === 1 ? '' : 's'}`
                    : 'Sin filtros aplicados'}
                </span>
                <button
                  type="button"
                  onClick={closePanel}
                  className="ml-auto inline-flex items-center justify-center border border-zinc-950 bg-zinc-950 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-150 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:border-zinc-300 sm:bg-white sm:text-zinc-950 sm:hover:border-zinc-950"
                >
                  Listo
                </button>
              </PanelFooter>
            </div>
          </div>

          {/* -------------------- Ordenar -------------------- */}
          <div ref={sortContainerRef} className="relative sm:w-64">
            <button
              ref={sortTriggerRef}
              type="button"
              onClick={(event) => togglePanel('sort', event.currentTarget)}
              aria-haspopup="dialog"
              aria-expanded={openPanel === 'sort'}
              aria-controls={sortPanelId}
              className={[
                'flex w-full items-center justify-between gap-3 border-b pb-1.5 pt-1 text-left transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600',
                currentSort !== 'destacados'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-zinc-300 text-zinc-950 hover:border-zinc-950',
              ].join(' ')}
            >
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Ordenar
                </span>
                <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {sortLabel}
                </span>
              </span>
              <ChevronIcon open={openPanel === 'sort'} />
            </button>

            {/* Panel Ordenar: siempre montado, cerrado = inert. */}
            <div
              ref={sortPanelRef}
              id={sortPanelId}
              role="dialog"
              aria-labelledby={`${sortPanelId}-title`}
              inert={openPanel !== 'sort'}
              data-state={openPanel === 'sort' ? 'open' : 'closed'}
              className={[
                'z-50 max-h-[85vh] overflow-hidden border-zinc-200 bg-white shadow-2xl transition-all duration-200 ease-out',
                'fixed inset-x-0 bottom-0 rounded-t-2xl border-t',
                'data-[state=closed]:pointer-events-none data-[state=closed]:translate-y-4 data-[state=closed]:opacity-0',
                'data-[state=open]:translate-y-0 data-[state=open]:opacity-100',
                'sm:absolute sm:inset-auto sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:max-h-none sm:w-full sm:rounded-none sm:border sm:shadow-lg',
                'sm:data-[state=closed]:-translate-y-1',
              ].join(' ')}
            >
              <PanelHeader
                id={`${sortPanelId}-title`}
                title="Ordenar"
                onClose={closePanel}
              />

              <div className="max-h-[calc(85vh-4rem)] overflow-y-auto px-4 py-2 sm:max-h-none sm:overflow-visible sm:px-2 sm:py-2">
                <div role="radiogroup" aria-labelledby={`${sortPanelId}-title`}>
                  {(Object.keys(SORT_LABELS) as SortOrder[]).map((order) => {
                    const isSelected = order === currentSort
                    return (
                      <button
                        key={order}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onSortChange(order)}
                        className={[
                          'group flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150',
                          'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600',
                          isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-transparent text-zinc-950 hover:bg-zinc-100',
                        ].join(' ')}
                      >
                        <span
                          aria-hidden
                          className={[
                            'inline-block size-2 shrink-0 rounded-full transition-colors duration-150',
                            isSelected ? 'bg-brand-600' : 'bg-zinc-300 group-hover:bg-zinc-400',
                          ].join(' ')}
                        />
                        <span className="truncate">{SORT_LABELS[order]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chips de filtros activos: siempre visibles cuando hay algo aplicado.
            Es la única forma de ver el estado sin reabrir el panel. */}
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
                label={`“${filters.q}”`}
                onRemove={() => update({ q: undefined })}
              />
            ) : null}

            <button
              type="button"
              onClick={() => {
                setQuery('')
                const params = new URLSearchParams()
                // Conserva el ordenamiento actual; sólo limpia los filtros.
                if (filters.sort && filters.sort !== 'destacados') {
                  params.set('sort', filters.sort)
                }
                const queryString = params.toString()
                router.replace(
                  queryString ? `${pathname}?${queryString}` : pathname,
                  { scroll: false },
                )
              }}
              className="ml-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-950"
            >
              Limpiar
            </button>
          </div>
        ) : null}
      </div>

      {/* Backdrop mobile (sólo cuando hay un panel abierto y estamos < sm). */}
      <div
        aria-hidden
        data-state={openPanel !== null ? 'open' : 'closed'}
        onClick={closePanel}
        className={[
          'fixed inset-0 z-40 bg-zinc-950/40 transition-opacity duration-200 sm:hidden',
          'pointer-events-none opacity-0',
          'data-[state=open]:pointer-events-auto data-[state=open]:opacity-100',
        ].join(' ')}
      />
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

/** Chevron pequeño que rota cuando el panel está abierto. */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={[
        'size-3 shrink-0 transition-transform duration-200 ease-out',
        open ? '-rotate-180' : 'rotate-0',
      ].join(' ')}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Cabecera común a ambos paneles: título a la izquierda y botón de cerrar a la
 * derecha (visible sólo en mobile, donde el panel es un bottom sheet que tapa
 * el resto del documento).
 */
function PanelHeader({
  id,
  title,
  onClose,
}: {
  id: string
  title: string
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 sm:px-5 sm:py-3.5">
      <h3
        id={id}
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-950"
      >
        {title}
      </h3>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Cerrar ${title.toLowerCase()}`}
        className="inline-flex items-center justify-center p-1 text-zinc-400 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:hidden"
      >
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

/** Pie del panel Filtros: estado a la izquierda + "Listo" para confirmar y cerrar. */
function PanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 sm:px-5">
      {children}
    </div>
  )
}

/**
 * Grupo de opciones tipo radio: una etiqueta (legend) y una columna de filas
 * seleccionables. La fila activa lleva borde y fondo brand, las demás son
 * transparentes con hover gris.
 */
function FilterRadioGroup({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const groupId = `${name}-group`
  return (
    <div className="mb-5 last:mb-0">
      <div
        id={groupId}
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400"
      >
        {label}
      </div>
      <div role="radiogroup" aria-labelledby={groupId} className="flex flex-col">
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
                'group flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600',
                isSelected
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-transparent text-zinc-950 hover:bg-zinc-100',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'inline-block size-2 shrink-0 rounded-full transition-colors duration-150',
                  isSelected ? 'bg-brand-600' : 'bg-zinc-300 group-hover:bg-zinc-400',
                ].join(' ')}
              />
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Chip removible de filtro activo. Sin cambios respecto a la versión anterior:
 * se conserva tal cual para no romper el lenguaje visual del catálogo.
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