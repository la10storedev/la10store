/**
 * CAPA DE ACCESO A DATOS (DAL) DE EQUIPOS Y LIGAS — SOLO SERVIDOR.
 *
 * Es el complemento de `products-store.ts` para las tablas maestras `teams` y
 * `leagues` y la papelera unificada:
 * - Lecturas para el panel "Equipos y Ligas" (`getAdminTeams`, `getAdminLeagues`)
 *   y para la papelera (`getDeletedTeams`, `getDeletedLeagues`, `getTrashCounts`).
 * - Mutaciones: crear, renombrar, activar/desactivar, soft delete, restaurar,
 *   purgar y editar asociaciones equipo↔ligas.
 *
 * Reglas de robustez:
 * - Las mutaciones NUNCA lanzan: ante cualquier fallo devuelven
 *   `{ ok: false, reason: 'error' }` y loguean con `console.error`.
 * - Las lecturas DEGRADAN GRACIOSAMENTE: si la columna `category`/`deleted_at`
 *   de `teams` (o la tabla `team_leagues`) todavía no existe (migración
 *   pendiente), devuelven listas vacías / conteos en cero y loguean con
 *   `console.warn`. El panel no se rompe antes de correr
 *   `scripts/add-taxonomy-columns.ts`.
 *
 * Solo corre en el servidor (usa `createAdminClient()` con la secret key).
 */
import { slugify } from '@/lib/products-store'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  DeletedLeague,
  DeletedTeam,
  ManagedLeague,
  ManagedTeam,
  ProductCategory,
  TaxonomyMutationResult,
  TrashCounts,
} from '@/types/product'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normaliza la categoría leída de la base a `ProductCategory`. */
function asCategory(value: unknown): ProductCategory {
  return value === 'seleccion' ? 'seleccion' : 'club'
}

/** Ordena alfabéticamente según `localeCompare('es')`. */
function sortSpanish<T>(values: T[], label: (value: T) => string): T[] {
  return [...values].sort((a, b) => label(a).localeCompare(label(b), 'es'))
}

/** Cuenta ocurrencias de una columna en memoria (evita aggregates embebidos). */
function countBy<T extends string | null>(
  rows: unknown[] | null | undefined,
  column: (row: Record<string, unknown>) => T,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const raw of rows ?? []) {
    const key = column((raw ?? {}) as Record<string, unknown>)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** Loggea y devuelve el resultado de error genérico de una mutación. */
function failure(context: string, error: unknown): TaxonomyMutationResult {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[taxonomy-store] ${context}: ${message}`)
  return { ok: false, reason: 'error' }
}

// ---------------------------------------------------------------------------
// Lecturas del panel
// ---------------------------------------------------------------------------

/**
 * Equipos administrados (no eliminados), ordenados alfabéticamente en español.
 *
 * `productCount` cuenta las camisetas `active = true` del equipo y `leagueIds`
 * son los IDs de las ligas activas asociadas en `team_leagues`. Para evitar
 * aggregates embebidos se hacen UNA query a `products` (conteo en memoria) y
 * UNA query a `team_leagues` (agrupada por `team_id` en memoria), no N queries.
 *
 * Degrada a `[]` (con warning) si `teams` no tiene las columnas `category` o
 * `deleted_at` todavía (migración pendiente); si falta la tabla `team_leagues`,
 * los equipos devuelven `leagueIds: []`.
 */
export async function getAdminTeams(): Promise<ManagedTeam[]> {
  const admin = createAdminClient()

  const [teamsRes, productsRes, relationsRes] = await Promise.all([
    admin.from('teams').select('id, name, category, active').is('deleted_at', null),
    admin.from('products').select('team_id').eq('active', true),
    admin.from('team_leagues').select('team_id, league_id').eq('active', true),
  ])

  if (teamsRes.error) {
    console.warn(
      '[taxonomy-store] getAdminTeams(): no se pudo leer teams (¿faltan category/deleted_at? migración pendiente), usando lista vacía',
    )
    return []
  }
  if (productsRes.error) {
    console.warn(
      '[taxonomy-store] getAdminTeams(): no se pudieron leer productos para contar, usando productCount=0',
    )
  }
  if (relationsRes.error) {
    console.warn(
      '[taxonomy-store] getAdminTeams(): no se pudo leer team_leagues para las asociaciones (¿migración pendiente?), usando leagueIds vacíos',
    )
  }

  const countByTeam = countBy(productsRes.data, (row) =>
    typeof row.team_id === 'string' ? row.team_id : null,
  )

  // league_ids ACTIVOS por equipo: una sola query a `team_leagues`, agrupada en
  // memoria. Los equipos sin asociaciones quedan con `[]`.
  const leaguesByTeam = new Map<string, string[]>()
  for (const raw of relationsRes.data ?? []) {
    const row = (raw ?? {}) as Record<string, unknown>
    if (typeof row.team_id === 'string' && typeof row.league_id === 'string') {
      const list = leaguesByTeam.get(row.team_id)
      if (list) list.push(row.league_id)
      else leaguesByTeam.set(row.team_id, [row.league_id])
    }
  }

  const teams: ManagedTeam[] = (teamsRes.data ?? []).map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>
    return {
      id: String(row.id),
      name: String(row.name),
      category: asCategory(row.category),
      active: row.active !== false,
      productCount: countByTeam.get(String(row.id)) ?? 0,
      leagueIds: leaguesByTeam.get(String(row.id)) ?? [],
    }
  })

  return sortSpanish(teams, (team) => team.name)
}

/**
 * Ligas administradas (no eliminadas), ordenadas alfabéticamente en español.
 *
 * `productCount` cuenta camisetas `active = true` por `league_id` (conteo en
 * memoria); `teamCount` cuenta las filas activas de `team_leagues`.
 *
 * Degrada a `[]` (con warning) si falta la columna `deleted_at` o la tabla
 * `team_leagues` (migración pendiente).
 */
export async function getAdminLeagues(): Promise<ManagedLeague[]> {
  const admin = createAdminClient()

  const [leaguesRes, productsRes, relationsRes] = await Promise.all([
    admin.from('leagues').select('id, name, category, active').is('deleted_at', null),
    admin.from('products').select('league_id').eq('active', true),
    admin.from('team_leagues').select('league_id').eq('active', true),
  ])

  if (leaguesRes.error) {
    console.warn(
      '[taxonomy-store] getAdminLeagues(): no se pudo leer leagues (¿falta deleted_at? migración pendiente), usando lista vacía',
    )
    return []
  }
  if (productsRes.error) {
    console.warn(
      '[taxonomy-store] getAdminLeagues(): no se pudieron leer productos para contar, usando productCount=0',
    )
  }
  if (relationsRes.error) {
    console.warn(
      '[taxonomy-store] getAdminLeagues(): no se pudo leer team_leagues para contar equipos (¿migración pendiente?), usando teamCount=0',
    )
  }

  const countByLeague = countBy(productsRes.data, (row) =>
    typeof row.league_id === 'string' ? row.league_id : null,
  )
  const teamsByLeague = countBy(relationsRes.data, (row) =>
    typeof row.league_id === 'string' ? row.league_id : null,
  )

  const leagues: ManagedLeague[] = (leaguesRes.data ?? []).map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>
    return {
      id: String(row.id),
      name: String(row.name),
      category: asCategory(row.category),
      active: row.active !== false,
      productCount: countByLeague.get(String(row.id)) ?? 0,
      teamCount: teamsByLeague.get(String(row.id)) ?? 0,
    }
  })

  return sortSpanish(leagues, (league) => league.name)
}

// ---------------------------------------------------------------------------
// Lecturas de la papelera
// ---------------------------------------------------------------------------

/**
 * Equipos en la papelera (`deleted_at IS NOT NULL`), ordenados alfabéticamente.
 *
 * `productCount` cuenta las camisetas del equipo en CUALQUIER estado (activas,
 * ocultas o eliminadas). Degrada a `[]` (con warning) si falta la columna
 * `deleted_at` (migración pendiente).
 */
export async function getDeletedTeams(): Promise<DeletedTeam[]> {
  const admin = createAdminClient()

  const [teamsRes, productsRes] = await Promise.all([
    admin.from('teams').select('id, name, category, deleted_at').not('deleted_at', 'is', null),
    admin.from('products').select('team_id'),
  ])

  if (teamsRes.error) {
    console.warn(
      '[taxonomy-store] getDeletedTeams(): no se pudo leer teams eliminados (¿falta deleted_at? migración pendiente), usando lista vacía',
    )
    return []
  }
  if (productsRes.error) {
    console.warn(
      '[taxonomy-store] getDeletedTeams(): no se pudieron leer productos para contar, usando productCount=0',
    )
  }

  const countByTeam = countBy(productsRes.data, (row) =>
    typeof row.team_id === 'string' ? row.team_id : null,
  )

  const teams: DeletedTeam[] = (teamsRes.data ?? []).map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>
    return {
      id: String(row.id),
      name: String(row.name),
      category: asCategory(row.category),
      deletedAt: String(row.deleted_at ?? ''),
      productCount: countByTeam.get(String(row.id)) ?? 0,
    }
  })

  return sortSpanish(teams, (team) => team.name)
}

/**
 * Ligas en la papelera (`deleted_at IS NOT NULL`), ordenadas alfabéticamente.
 *
 * `productCount` cuenta las camisetas de la liga en CUALQUIER estado;
 * `teamCount` cuenta los equipos asociados activos en `team_leagues`. Degrada a
 * `[]` (con warning) si falta la columna `deleted_at` o la tabla `team_leagues`.
 */
export async function getDeletedLeagues(): Promise<DeletedLeague[]> {
  const admin = createAdminClient()

  const [leaguesRes, productsRes, relationsRes] = await Promise.all([
    admin.from('leagues').select('id, name, category, deleted_at').not('deleted_at', 'is', null),
    admin.from('products').select('league_id'),
    admin.from('team_leagues').select('league_id').eq('active', true),
  ])

  if (leaguesRes.error) {
    console.warn(
      '[taxonomy-store] getDeletedLeagues(): no se pudo leer leagues eliminadas (¿falta deleted_at? migración pendiente), usando lista vacía',
    )
    return []
  }
  if (productsRes.error) {
    console.warn(
      '[taxonomy-store] getDeletedLeagues(): no se pudieron leer productos para contar, usando productCount=0',
    )
  }
  if (relationsRes.error) {
    console.warn(
      '[taxonomy-store] getDeletedLeagues(): no se pudo leer team_leagues para contar equipos (¿migración pendiente?), usando teamCount=0',
    )
  }

  const countByLeague = countBy(productsRes.data, (row) =>
    typeof row.league_id === 'string' ? row.league_id : null,
  )
  const teamsByLeague = countBy(relationsRes.data, (row) =>
    typeof row.league_id === 'string' ? row.league_id : null,
  )

  const leagues: DeletedLeague[] = (leaguesRes.data ?? []).map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>
    return {
      id: String(row.id),
      name: String(row.name),
      category: asCategory(row.category),
      deletedAt: String(row.deleted_at ?? ''),
      productCount: countByLeague.get(String(row.id)) ?? 0,
      teamCount: teamsByLeague.get(String(row.id)) ?? 0,
    }
  })

  return sortSpanish(leagues, (league) => league.name)
}

/**
 * Conteos de la papelera unificada. `products` son las camisetas con
 * `active = false`; `teams`/`leagues` los registros con `deleted_at` seteado.
 * Degrada a 0 (con warning) en la parte cuya columna/tabla falte.
 */
export async function getTrashCounts(): Promise<TrashCounts> {
  const admin = createAdminClient()

  const [productsRes, teamsRes, leaguesRes] = await Promise.all([
    admin.from('products').select('id').eq('active', false),
    admin.from('teams').select('id').not('deleted_at', 'is', null),
    admin.from('leagues').select('id').not('deleted_at', 'is', null),
  ])

  if (productsRes.error || teamsRes.error || leaguesRes.error) {
    console.warn(
      '[taxonomy-store] getTrashCounts(): alguna lectura falló (¿migración pendiente?), usando 0 en esa parte',
    )
  }

  const products = productsRes.error ? 0 : (productsRes.data ?? []).length
  const teams = teamsRes.error ? 0 : (teamsRes.data ?? []).length
  const leagues = leaguesRes.error ? 0 : (leaguesRes.data ?? []).length

  return { products, teams, leagues, total: products + teams + leagues }
}

// ---------------------------------------------------------------------------
// Mutaciones: crear / renombrar / activar
// ---------------------------------------------------------------------------

/**
 * Crea un equipo. El id deriva del nombre (`slugify`); si ya existe una fila con
 * ese id en CUALQUIER estado (activa, inactiva o eliminada), devuelve
 * `duplicate` sin tocar nada. Nunca lanza.
 */
export async function createTeam(
  name: string,
  category: ProductCategory,
): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const trimmed = name.trim()
  const id = slugify(trimmed) || 'equipo'

  const existing = await admin.from('teams').select('id').eq('id', id).maybeSingle()
  if (existing.error) return failure(`createTeam(${name})`, existing.error)
  if (existing.data) return { ok: false, reason: 'duplicate' }

  const { error } = await admin.from('teams').insert({ id, name: trimmed, category, active: true })
  if (error) {
    // Carrera: otro request pudo crear el mismo id entre el select y el insert.
    const retry = await admin.from('teams').select('id').eq('id', id).maybeSingle()
    if (!retry.error && retry.data) return { ok: false, reason: 'duplicate' }
    return failure(`createTeam(${name})`, error)
  }
  return { ok: true }
}

/** Crea una liga (mismas reglas que `createTeam`). Nunca lanza. */
export async function createLeague(
  name: string,
  category: ProductCategory,
): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const trimmed = name.trim()
  const id = slugify(trimmed) || 'liga'

  const existing = await admin.from('leagues').select('id').eq('id', id).maybeSingle()
  if (existing.error) return failure(`createLeague(${name})`, existing.error)
  if (existing.data) return { ok: false, reason: 'duplicate' }

  const { error } = await admin.from('leagues').insert({ id, name: trimmed, category, active: true })
  if (error) {
    const retry = await admin.from('leagues').select('id').eq('id', id).maybeSingle()
    if (!retry.error && retry.data) return { ok: false, reason: 'duplicate' }
    return failure(`createLeague(${name})`, error)
  }
  return { ok: true }
}

/** Renombra un equipo por id. Sin fila → `not_found`. Nunca lanza. */
export async function renameTeam(id: string, name: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('teams')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return failure(`renameTeam(${id})`, error)
  if (!data) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/** Renombra una liga por id. Sin fila → `not_found`. Nunca lanza. */
export async function renameLeague(id: string, name: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('leagues')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return failure(`renameLeague(${id})`, error)
  if (!data) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/** Activa/desactiva un equipo no eliminado. Sin fila → `not_found`. */
export async function setTeamActive(
  id: string,
  active: boolean,
): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('teams')
    .update({ active })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) return failure(`setTeamActive(${id}, ${active})`, error)
  if (!data) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/** Activa/desactiva una liga no eliminada. Sin fila → `not_found`. */
export async function setLeagueActive(
  id: string,
  active: boolean,
): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('leagues')
    .update({ active })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) return failure(`setLeagueActive(${id}, ${active})`, error)
  if (!data) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Mutaciones: soft delete, restaurar y purgar
// ---------------------------------------------------------------------------

/**
 * Soft delete de un equipo: solo se elimina si NO tiene camisetas activas; si
 * las tiene devuelve `has_products` con el conteo. Marca `{ active: false,
 * deleted_at: now }`. Nunca lanza.
 */
export async function softDeleteTeam(id: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()

  const products = await admin.from('products').select('team_id').eq('team_id', id).eq('active', true)
  if (products.error) return failure(`softDeleteTeam(${id}): contar camisetas`, products.error)

  const count = products.data?.length ?? 0
  if (count > 0) return { ok: false, reason: 'has_products', count }

  const { data, error } = await admin
    .from('teams')
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return failure(`softDeleteTeam(${id})`, error)
  if (!data) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/** Soft delete de una liga (mismas reglas que `softDeleteTeam`, por `league_id`). */
export async function softDeleteLeague(id: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()

  const products = await admin
    .from('products')
    .select('league_id')
    .eq('league_id', id)
    .eq('active', true)
  if (products.error) return failure(`softDeleteLeague(${id}): contar camisetas`, products.error)

  const count = products.data?.length ?? 0
  if (count > 0) return { ok: false, reason: 'has_products', count }

  const { data, error } = await admin
    .from('leagues')
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return failure(`softDeleteLeague(${id})`, error)
  if (!data) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/** Restaura un equipo de la papelera: `{ active: true, deleted_at: null }`. */
export async function restoreTeam(id: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('teams')
    .update({ active: true, deleted_at: null })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return failure(`restoreTeam(${id})`, error)
  if (!data) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/** Restaura una liga de la papelera: `{ active: true, deleted_at: null }`. */
export async function restoreLeague(id: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('leagues')
    .update({ active: true, deleted_at: null })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return failure(`restoreLeague(${id})`, error)
  if (!data) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/**
 * Hard delete (purgado) de un equipo: si tiene camisetas en CUALQUIER estado
 * devuelve `referenced` con el conteo; si no, borra sus filas de `team_leagues`
 * y luego el equipo. Nunca lanza.
 */
export async function hardDeleteTeam(id: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()

  const products = await admin.from('products').select('team_id').eq('team_id', id)
  if (products.error) return failure(`hardDeleteTeam(${id}): contar camisetas`, products.error)

  const count = products.data?.length ?? 0
  if (count > 0) return { ok: false, reason: 'referenced', count }

  const relations = await admin.from('team_leagues').delete().eq('team_id', id)
  if (relations.error) {
    return failure(`hardDeleteTeam(${id}): limpiar team_leagues`, relations.error)
  }

  const { count: deletedCount, error } = await admin
    .from('teams')
    .delete({ count: 'exact' })
    .eq('id', id)
  if (error) return failure(`hardDeleteTeam(${id})`, error)
  if ((deletedCount ?? 0) === 0) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/** Hard delete (purgado) de una liga (mismas reglas que `hardDeleteTeam`). */
export async function hardDeleteLeague(id: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()

  const products = await admin.from('products').select('league_id').eq('league_id', id)
  if (products.error) return failure(`hardDeleteLeague(${id}): contar camisetas`, products.error)

  const count = products.data?.length ?? 0
  if (count > 0) return { ok: false, reason: 'referenced', count }

  const relations = await admin.from('team_leagues').delete().eq('league_id', id)
  if (relations.error) {
    return failure(`hardDeleteLeague(${id}): limpiar team_leagues`, relations.error)
  }

  const { count: deletedCount, error } = await admin
    .from('leagues')
    .delete({ count: 'exact' })
    .eq('id', id)
  if (error) return failure(`hardDeleteLeague(${id})`, error)
  if ((deletedCount ?? 0) === 0) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

/** Hard delete (purgado definitivo) de una camiseta desde la papelera. */
export async function hardDeleteProduct(id: string): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()
  const { count, error } = await admin.from('products').delete({ count: 'exact' }).eq('id', id)
  if (error) return failure(`hardDeleteProduct(${id})`, error)
  if ((count ?? 0) === 0) return { ok: false, reason: 'not_found' }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Mutaciones: asociaciones equipo <-> ligas
// ---------------------------------------------------------------------------

/**
 * Fija las ligas asociadas a un equipo. Las ligas deseadas se reactivan con un
 * upsert sobre la PK compuesta `(team_id, league_id)`; las asociaciones actuales
 * que dejan de estar en la lista se DESACTIVAN (`active = false`), no se borran.
 * Sin equipo → `not_found`. Nunca lanza.
 */
export async function setTeamLeagues(
  teamId: string,
  leagueIds: string[],
): Promise<TaxonomyMutationResult> {
  const admin = createAdminClient()

  const team = await admin.from('teams').select('id').eq('id', teamId).maybeSingle()
  if (team.error) return failure(`setTeamLeagues(${teamId}): buscar equipo`, team.error)
  if (!team.data) return { ok: false, reason: 'not_found' }

  const desired = new Set(leagueIds.map((id) => String(id).trim()).filter(Boolean))

  if (desired.size > 0) {
    const rows = [...desired].map((leagueId) => ({
      team_id: teamId,
      league_id: leagueId,
      active: true,
    }))
    const { error } = await admin
      .from('team_leagues')
      .upsert(rows, { onConflict: 'team_id,league_id' })
    if (error) return failure(`setTeamLeagues(${teamId}): upsert deseadas`, error)
  }

  const current = await admin.from('team_leagues').select('league_id').eq('team_id', teamId)
  if (current.error) return failure(`setTeamLeagues(${teamId}): leer actuales`, current.error)

  const stale = (current.data ?? [])
    .map((row) => (row as Record<string, unknown>)?.league_id)
    .filter((leagueId): leagueId is string => typeof leagueId === 'string' && !desired.has(leagueId))

  if (stale.length > 0) {
    const { error } = await admin
      .from('team_leagues')
      .update({ active: false })
      .eq('team_id', teamId)
      .in('league_id', stale)
    if (error) return failure(`setTeamLeagues(${teamId}): desactivar no deseadas`, error)
  }

  return { ok: true }
}