import { addTaxonomyValue, getTaxonomyByCategory } from '@/lib/products'
import { siteConfig } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  Product,
  ProductCategory,
  ProductColors,
  ProductDraft,
  ProductSize,
  Taxonomy,
  TeamLeagueMap,
} from '@/types/product'

/** Cliente admin tipado tal como lo construye `createAdminClient()`. */
type AdminClient = ReturnType<typeof createAdminClient>

/**
 * CAPA DE ACCESO A DATOS (DAL) — SOLO SERVIDOR.
 *
 * La fuente de verdad es Supabase (Postgres): tablas `products`, `teams` y
 * `leagues`. Las imagenes viven en Cloudinary y se referencian por URL en la
 * columna `images`.
 *
 * Notas importantes:
 * - No usa cache: cada llamada va a la base, asi el panel de admin ve al
 *   instante los cambios que escribe. Por eso las paginas publicas declaran
 *   `export const dynamic = 'force-dynamic'`.
 * - Usa el cliente admin (secret key) porque esta capa es la unica puerta de
 *   acceso a los datos de la app y necesita leer/escribir sin depender de la
 *   configuracion de RLS. Solo corre en el servidor y nunca se bundlea al
 *   cliente (la secret key no tiene prefijo NEXT_PUBLIC_).
 * - La interfaz es identica a la version con `products.json`: el resto de la
 *   app no cambia.
 */

/** Columnas + joins que convierten una fila de `products` en un `Product`. */
const PRODUCT_SELECT = [
  'id',
  'name',
  'team_id',
  'category',
  'league_id',
  'season',
  'description',
  'price',
  'images',
  'sizes',
  'colors',
  'featured',
  'visible',
  'created_at',
  'deleted_at',
  'teams(name)',
  'leagues(name)',
].join(', ')

/** Fila cruda de `products` con sus joins resueltos. */
type ProductRow = {
  id: string
  name: string
  team_id: string | null
  category: ProductCategory
  league_id: string | null
  season: string
  description: string
  price: number
  images: string[] | null
  sizes: ProductSize[] | null
  colors: ProductColors | null
  featured: boolean
  visible: boolean
  created_at: string
  deleted_at: string | null
  teams: { name: string } | null
  leagues: { name: string } | null
}

function mapRowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    team: row.teams?.name ?? '',
    category: row.category,
    league: row.leagues?.name ?? '',
    season: row.season,
    description: row.description,
    price: Number(row.price),
    images: Array.isArray(row.images) ? row.images : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    colors: row.colors ?? { primary: '#16a34a', secondary: '#ffffff' },
    featured: row.featured ?? false,
    visible: row.visible ?? true,
    createdAt: String(row.created_at ?? ''),
  }
}

/**
 * Las filas vienen tipadas por el parser de postgrest-js como
 * `GenericStringError` (porque el select es dinamico). Las casteamos a
 * nuestro tipo de fila: son valores JSON de la API, no hay validacion
 * adicional que hacer.
 */
function asProductRow(value: unknown): ProductRow {
  return value as ProductRow
}

function asIdRow(value: unknown): { id: string } {
  return value as { id: string }
}

/** Producto con la fecha de eliminacion (soft delete) ya resuelta. */
export type DeletedProduct = Product & { deletedAt: string }

function asDeletedProductRow(value: unknown): ProductRow & { deleted_at: string } {
  return value as ProductRow & { deleted_at: string }
}

/** Loggea y lanza el error de la operacion que fallo. */
function fail(context: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[products-store] ${context}: ${message}`)
  throw new Error(`[products-store] ${context}: ${message}`)
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

/**
 * Lista de productos del catalogo.
 *
 * Por defecto devuelve SOLO los activos (`active = true`, la fuente de verdad
 * de existencia) y SOLO los visibles (para el publico). El panel de admin pasa
 * `{ includeHidden: true }` para ver tambien los ocultos; `{ includeDeleted:
 * true }` incluye ademas los eliminados (no lo usa el panel de inventario,
 * solo por si hace falta).
 */
export async function getAllProducts(options?: {
  includeHidden?: boolean
  includeDeleted?: boolean
}): Promise<Product[]> {
  const { includeHidden = false, includeDeleted = false } = options ?? {}
  const admin = createAdminClient()

  let query = admin
    .from('products')
    .select(PRODUCT_SELECT)
    .order('created_at', { ascending: false })

  if (!includeHidden) query = query.eq('visible', true)
  if (!includeDeleted) query = query.eq('active', true)

  const { data, error } = await query
  if (error) {
    console.error('[products-store] getAllProducts:', error.message)
    return []
  }
  return (data ?? []).map((row) => mapRowToProduct(asProductRow(row)))
}

export async function getProductById(
  id: string,
  options?: { includeHidden?: boolean; includeDeleted?: boolean },
): Promise<Product | null> {
  const { includeHidden = false, includeDeleted = false } = options ?? {}
  const admin = createAdminClient()

  let query = admin.from('products').select(PRODUCT_SELECT).eq('id', id)
  if (!includeHidden) query = query.eq('visible', true)
  if (!includeDeleted) query = query.eq('active', true)

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error(`[products-store] getProductById(${id}):`, error.message)
    return null
  }
  return data ? mapRowToProduct(asProductRow(data)) : null
}

/**
 * Equipos y ligas para los desplegables del panel, separados por categoria.
 *
 * Cada lista es la UNION sin duplicados de dos fuentes:
 * 1. Las filas de las tablas `teams`/`leagues` con `active = true` y
 *    `deleted_at IS NULL`, agrupadas por la columna `category`.
 * 2. Los valores derivados de los productos (incluye ocultos) con
 *    `getTaxonomyByCategory`, para que nunca falte un equipo/liga aunque la
 *    fila maestra todavía no exista.
 *
 * El resultado queda ordenado alfabeticamente en español. Si la query a la
 * tabla falla (columnas `category`/`deleted_at` ausentes, migración pendiente),
 * usa `[]` para esa fuente y sigue: la taxonomia derivada de productos evita el
 * crash. Incluye las asociaciones equipo↔ligas de `team_leagues`, por categoria.
 */
export async function getTaxonomy(): Promise<Taxonomy> {
  const admin = createAdminClient()

  const [products, associations, teamsRes, leaguesRes] = await Promise.all([
    getAllProducts({ includeHidden: true }),
    getTeamLeagueAssociations(),
    admin
      .from('teams')
      .select('id, name, category')
      .eq('active', true)
      .is('deleted_at', null),
    admin
      .from('leagues')
      .select('id, name, category')
      .eq('active', true)
      .is('deleted_at', null),
  ])

  const taxonomy = getTaxonomyByCategory(products)

  // Equipos de la tabla `teams` por categoria (fallback a [] si la migración
  // de `category`/`deleted_at` todavía no se aplicó).
  const teamsFromTable: Record<ProductCategory, string[]> = { seleccion: [], club: [] }
  if (teamsRes.error) {
    console.warn(
      '[products-store] getTaxonomy(): no se pudo leer teams (¿migración pendiente?), usando solo los derivados de productos',
    )
  } else {
    for (const row of teamsRes.data ?? []) {
      if (row && typeof row.name === 'string') {
        const category: ProductCategory = row.category === 'seleccion' ? 'seleccion' : 'club'
        teamsFromTable[category] = addTaxonomyValue(teamsFromTable[category], row.name)
      }
    }
  }

  // Ligas de la tabla `leagues` por categoria (idem).
  const leaguesFromTable: Record<ProductCategory, string[]> = { seleccion: [], club: [] }
  if (leaguesRes.error) {
    console.warn(
      '[products-store] getTaxonomy(): no se pudo leer leagues (¿migración pendiente?), usando solo los derivados de productos',
    )
  } else {
    for (const row of leaguesRes.data ?? []) {
      if (row && typeof row.name === 'string') {
        const category: ProductCategory = row.category === 'seleccion' ? 'seleccion' : 'club'
        leaguesFromTable[category] = addTaxonomyValue(leaguesFromTable[category], row.name)
      }
    }
  }

  // Union sin duplicados y orden alfabetico (es) de ambas fuentes.
  const merge = (derived: string[], fromTable: string[]): string[] =>
    fromTable.reduce((acc, value) => addTaxonomyValue(acc, value), [...derived])

  return {
    seleccion: {
      teams: merge(taxonomy.seleccion.teams, teamsFromTable.seleccion),
      leagues: merge(taxonomy.seleccion.leagues, leaguesFromTable.seleccion),
      associations: associations.seleccion,
    },
    club: {
      teams: merge(taxonomy.club.teams, teamsFromTable.club),
      leagues: merge(taxonomy.club.leagues, leaguesFromTable.club),
      associations: associations.club,
    },
  }
}

// ---------------------------------------------------------------------------
// Asociaciones equipo <-> ligas (tabla `team_leagues`, N:M)
// ---------------------------------------------------------------------------

/** Asociaciones vacias por categoria (fallback cuando la tabla no existe). */
function emptyTeamLeagueAssociations(): Record<ProductCategory, TeamLeagueMap> {
  return {
    seleccion: { teamLeagues: {}, leagueTeams: {} },
    club: { teamLeagues: {}, leagueTeams: {} },
  }
}

/**
 * Asociaciones equipo↔ligas de la tabla `team_leagues`, agrupadas POR CATEGORIA
 * de liga y con claves por NOMBRE (no por id).
 *
 * Trae `teams(id, name)`, `leagues(id, name, category)` y `team_leagues` y las
 * une en memoria: son tres lecturas baratas y evita dependencias de la sintaxis
 * de joins de postgrest. Las listas salen ordenadas alfabeticamente en español.
 *
 * Solo considera registros activos (`active = true`): equipos, ligas o
 * asociaciones desactivadas no aparecen en la taxonomia ni en los filtros.
 *
 * Degrada GRACIOSAMENTE: si la tabla `team_leagues` no existe todavia (migracion
 * pendiente), devuelve mapas vacios y loguea un warning. El catalogo no se
 * rompe antes de correr la migracion.
 */
export async function getTeamLeagueAssociations(): Promise<
  Record<ProductCategory, TeamLeagueMap>
> {
  const admin = createAdminClient()

  const [teamsRes, leaguesRes, relationsRes] = await Promise.all([
    admin.from('teams').select('id, name').eq('active', true),
    admin.from('leagues').select('id, name, category').eq('active', true),
    admin.from('team_leagues').select('team_id, league_id').eq('active', true),
  ])

  if (teamsRes.error || leaguesRes.error || relationsRes.error) {
    console.warn(
      '[products-store] getTeamLeagueAssociations(): no se pudieron leer las asociaciones (tabla team_leagues quizas no existe aun), usando vacio',
    )
    return emptyTeamLeagueAssociations()
  }

  const teamNameById = new Map<string, string>()
  for (const row of teamsRes.data ?? []) {
    if (row && typeof row.id === 'string' && typeof row.name === 'string') {
      teamNameById.set(row.id, row.name)
    }
  }

  // id de liga -> { name, category }. Solo ligas con categoria valida.
  const leagueById = new Map<string, { name: string; category: ProductCategory }>()
  for (const row of leaguesRes.data ?? []) {
    if (row && typeof row.id === 'string' && typeof row.name === 'string') {
      const category: ProductCategory = row.category === 'seleccion' ? 'seleccion' : 'club'
      leagueById.set(row.id, { name: row.name, category })
    }
  }

  // Acumuladores por categoria, sin duplicar (Set) y sin ordenar todavia.
  const teamLeagues: Record<ProductCategory, Record<string, Set<string>>> = {
    seleccion: {},
    club: {},
  }
  const leagueTeams: Record<ProductCategory, Record<string, Set<string>>> = {
    seleccion: {},
    club: {},
  }

  for (const relation of relationsRes.data ?? []) {
    const teamName = teamNameById.get(relation.team_id)
    const league = leagueById.get(relation.league_id)
    if (!teamName || !league) continue
    const category = league.category

    let leaguesOfTeam = teamLeagues[category][teamName]
    if (!leaguesOfTeam) {
      leaguesOfTeam = new Set<string>()
      teamLeagues[category][teamName] = leaguesOfTeam
    }
    leaguesOfTeam.add(league.name)

    let teamsOfLeague = leagueTeams[category][league.name]
    if (!teamsOfLeague) {
      teamsOfLeague = new Set<string>()
      leagueTeams[category][league.name] = teamsOfLeague
    }
    teamsOfLeague.add(teamName)
  }

  const sortSpanish = (values: Iterable<string>): string[] =>
    [...values].sort((a, b) => a.localeCompare(b, 'es'))

  const result: Record<ProductCategory, TeamLeagueMap> = {
    seleccion: { teamLeagues: {}, leagueTeams: {} },
    club: { teamLeagues: {}, leagueTeams: {} },
  }
  for (const category of ['seleccion', 'club'] as const) {
    for (const [teamName, leaguesOfTeam] of Object.entries(teamLeagues[category])) {
      result[category].teamLeagues[teamName] = sortSpanish(leaguesOfTeam)
    }
    for (const [leagueName, teamsOfLeague] of Object.entries(leagueTeams[category])) {
      result[category].leagueTeams[leagueName] = sortSpanish(teamsOfLeague)
    }
  }

  return result
}

/**
 * Registra la asociacion equipo↔liga en `team_leagues`. Idempotente y tolerante
 * a carreras.
 *
 * Usa upsert sobre la PK compuesta `(team_id, league_id)`: si la asociacion ya
 * existia, la reactiva (`active = true`) en vez de fallar con duplicado. Como
 * `team_leagues` solo tiene estas tres columnas, no hay datos maestros que se
 * puedan pisar. Nunca lanza: un fallo de asociacion no puede impedir el
 * guardado del producto.
 */
async function ensureTeamLeague(
  admin: AdminClient,
  teamId: string,
  leagueId: string,
): Promise<void> {
  const { error } = await admin
    .from('team_leagues')
    .upsert(
      { team_id: teamId, league_id: leagueId, active: true },
      { onConflict: 'team_id,league_id' },
    )

  if (error) {
    console.warn(
      `[products-store] ensureTeamLeague(${teamId}, ${leagueId}): ${error.message} (se ignora, el producto se guarda igual)`,
    )
  }
}

/**
 * Productos eliminados (soft delete), ordenados del mas reciente al mas
 * antiguo. Devuelve tambien `deletedAt` con la fecha de eliminacion.
 *
 * La fuente de verdad de la eliminacion es `active = false`.
 */
export async function getDeletedProducts(): Promise<DeletedProduct[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', false)
    .order('deleted_at', { ascending: false })

  if (error) {
    console.error('[products-store] getDeletedProducts:', error.message)
    return []
  }
  return (data ?? []).map((row) => {
    const raw = asDeletedProductRow(row)
    return { ...mapRowToProduct(raw), deletedAt: raw.deleted_at }
  })
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

/** `Boca Juniors 2024 · Local` -> `boca-juniors-2024-local` */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function createId(draft: ProductDraft): string {
  const base = slugify(`${draft.team}-${draft.season}`) || 'producto'
  // Sufijo aleatorio para evitar colisiones si se repite nombre/temporada.
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Reactiva un registro maestro (`teams`/`leagues`) si esta desactivado.
 *
 * ELEGIDO: en vez de un upsert global (que podria pisar `name`/`category` con
 * el payload nuevo), se hace un `update({ active: true })` apuntado por id SOLO
 * cuando el registro existe con `active = false`. Asi el dato maestro existente
 * nunca se sobrescribe y la reactivacion es un cambio minimo y explicito. Un
 * fallo aca solo se loguea: reactivar es un beneficio, no puede impedir el
 * guardado del producto.
 */
async function reactivateIfInactive(
  admin: AdminClient,
  table: 'teams' | 'leagues',
  id: string,
  active: unknown,
): Promise<void> {
  if (active !== false) return
  const { error } = await admin.from(table).update({ active: true }).eq('id', id)
  if (error) {
    console.warn(`[products-store] reactivar ${table}(${id}): ${error.message} (se ignora)`)
  }
}

/**
 * Garantiza que el equipo exista en `teams` y devuelve su id.
 *
 * Crea el registro si falta (activo por default, con su `category`); si ya
 * existe, NO pisa su `category` (dato maestro) y solo lo reactiva si estaba
 * desactivado. Tolerante a carreras (otro request pudo crearlo).
 */
async function ensureTeam(name: string, category: ProductCategory): Promise<string> {
  const admin = createAdminClient()
  const id = slugify(name) || 'equipo'

  const existing = await admin.from('teams').select('id, active').eq('id', id).maybeSingle()
  if (existing.data) {
    await reactivateIfInactive(admin, 'teams', id, existing.data.active)
    return asIdRow(existing.data).id
  }

  const { error } = await admin.from('teams').insert({ id, name, category })
  if (error) {
    const retry = await admin.from('teams').select('id, active').eq('id', id).maybeSingle()
    if (retry.data) {
      await reactivateIfInactive(admin, 'teams', id, retry.data.active)
      return asIdRow(retry.data).id
    }
    fail(`ensureTeam(${name})`, error)
  }
  return id
}

/** Garantiza que la liga exista en `leagues` y devuelve su id. */
async function ensureLeague(name: string, category: ProductCategory): Promise<string> {
  const admin = createAdminClient()
  const id = slugify(name) || 'liga'

  const existing = await admin.from('leagues').select('id, active').eq('id', id).maybeSingle()
  if (existing.data) {
    await reactivateIfInactive(admin, 'leagues', id, existing.data.active)
    return asIdRow(existing.data).id
  }

  const { error } = await admin.from('leagues').insert({ id, name, category })
  if (error) {
    const retry = await admin.from('leagues').select('id, active').eq('id', id).maybeSingle()
    if (retry.data) {
      await reactivateIfInactive(admin, 'leagues', id, retry.data.active)
      return asIdRow(retry.data).id
    }
    fail(`ensureLeague(${name})`, error)
  }
  return id
}

export async function createProduct(draft: ProductDraft): Promise<Product> {
  const admin = createAdminClient()
  const id = createId(draft)
  const createdAt = new Date().toISOString()
  const team_id = await ensureTeam(draft.team, draft.category)
  const league_id = await ensureLeague(draft.league, draft.category)

  // La asociacion es un dato maestro complementario: si falla, el producto se
  // guarda igual (se reintenta en el proximo save).
  try {
    await ensureTeamLeague(admin, team_id, league_id)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[products-store] createProduct(${id}): no se pudo asociar equipo-liga: ${message}`)
  }

  const { error } = await admin.from('products').insert({
    id,
    name: draft.name,
    team_id,
    category: draft.category,
    league_id,
    season: draft.season,
    description: draft.description,
    price: draft.price,
    images: draft.images,
    sizes: draft.sizes,
    colors: draft.colors,
    featured: draft.featured,
    visible: draft.visible ?? true,
    created_at: createdAt,
  })
  if (error) fail(`createProduct(${id})`, error)

  return {
    ...draft,
    visible: draft.visible ?? true,
    id,
    createdAt,
  }
}

export async function updateProduct(id: string, draft: ProductDraft): Promise<Product | null> {
  const admin = createAdminClient()
  const team_id = await ensureTeam(draft.team, draft.category)
  const league_id = await ensureLeague(draft.league, draft.category)

  try {
    await ensureTeamLeague(admin, team_id, league_id)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[products-store] updateProduct(${id}): no se pudo asociar equipo-liga: ${message}`)
  }

  const { data, error } = await admin
    .from('products')
    .update({
      name: draft.name,
      team_id,
      category: draft.category,
      league_id,
      season: draft.season,
      description: draft.description,
      price: draft.price,
      images: draft.images,
      sizes: draft.sizes,
      colors: draft.colors,
      featured: draft.featured,
      visible: draft.visible ?? true,
    })
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .maybeSingle()

  if (error) fail(`updateProduct(${id})`, error)
  return data ? mapRowToProduct(asProductRow(data)) : null
}

export async function deleteProduct(id: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error, count } = await admin.from('products').delete({ count: 'exact' }).eq('id', id)
  if (error) fail(`deleteProduct(${id})`, error)
  return (count ?? 0) > 0
}

/**
 * Soft delete: marca la fila con `active = false` y `deleted_at = NOW()`. El
 * producto deja de verse en el catalogo y en el inventario, pero se puede
 * restaurar desde `/admin/eliminados`. `active` es la fuente de verdad;
 * `deleted_at` se mantiene como registro historico.
 */
export async function softDeleteProduct(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('products')
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) fail(`softDeleteProduct(${id})`, error)
}

/** Restaura un producto eliminado: `active = true` y `deleted_at = NULL`. */
export async function restoreProduct(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('products').update({ active: true, deleted_at: null }).eq('id', id)
  if (error) fail(`restoreProduct(${id})`, error)
}

/** Suma (delta > 0) o resta (delta < 0) stock de un talle, sin bajar de 0. */
export async function adjustStock(
  id: string,
  size: string,
  delta: number,
): Promise<Product | null> {
  const admin = createAdminClient()

  const current = await admin.from('products').select('sizes').eq('id', id).maybeSingle()
  if (current.error) fail(`adjustStock(${id})`, current.error)
  if (!current.data) return null

  const sizesRow = asProductRow(current.data).sizes
  const sizes: ProductSize[] = Array.isArray(sizesRow) ? (sizesRow as ProductSize[]) : []
  const next = sizes.map((item) =>
    item.size === size ? { ...item, stock: Math.max(0, item.stock + delta) } : item,
  )

  const { data, error } = await admin
    .from('products')
    .update({ sizes: next })
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .maybeSingle()
  if (error) fail(`adjustStock(${id})`, error)
  return data ? mapRowToProduct(asProductRow(data)) : null
}

/** Muestra u oculta un producto en el catalogo publico. */
export async function setProductVisibility(id: string, visible: boolean): Promise<Product | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('products')
    .update({ visible })
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .maybeSingle()
  if (error) fail(`setProductVisibility(${id})`, error)
  return data ? mapRowToProduct(asProductRow(data)) : null
}

/** Fija el stock exacto de un talle (edicion rapida desde el popover de stock). */
export async function setSizeStock(
  id: string,
  size: string,
  stock: number,
): Promise<Product | null> {
  const admin = createAdminClient()

  const current = await admin.from('products').select('sizes').eq('id', id).maybeSingle()
  if (current.error) fail(`setSizeStock(${id})`, current.error)
  if (!current.data) return null

  const sizesRow = asProductRow(current.data).sizes
  const sizes: ProductSize[] = Array.isArray(sizesRow) ? (sizesRow as ProductSize[]) : []
  const next = sizes.map((item) =>
    item.size === size ? { ...item, stock: Math.max(0, Math.trunc(stock)) } : item,
  )

  const { data, error } = await admin
    .from('products')
    .update({ sizes: next })
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .maybeSingle()
  if (error) fail(`setSizeStock(${id})`, error)
  return data ? mapRowToProduct(asProductRow(data)) : null
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

/** Valores por defecto del hero cuando la tabla site_settings no existe aún. */
const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  hero_image: '',
  hero_title: 'Camisetas de selecciones y clubes',
  hero_subtitle: 'Elegi tu talle y consultanos por WhatsApp. Te confirmamos disponibilidad, medidas y forma de pago. Sin carrito, sin pagos online: hablamos directo.',
  hero_tagline: 'Tu camiseta, tu pasión',
  hero_cta_text: 'Ver catalogo',
  hero_cta_link: '#catalogo',
  whatsapp_number: '5491123456789',
}

/** Devuelve todas las filas de `site_settings` como un objeto `{ key: value }`. Si la tabla no existe, devuelve defaults. */
export async function getSiteSettings(): Promise<Record<string, string>> {
  const admin = createAdminClient()

  const { data, error } = await admin.from('site_settings').select('*')
  if (error) {
    // Si la tabla no existe aún, devolver defaults sin fallar
    console.warn('[products-store] getSiteSettings(): tabla no disponible, usando defaults')
    return { ...DEFAULT_SITE_SETTINGS }
  }

  const settings: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row && typeof row.key === 'string') settings[row.key] = String(row.value ?? '')
  }
  // Mezclar con defaults para garantizar que todas las keys existan
  return { ...DEFAULT_SITE_SETTINGS, ...settings }
}

/** Upsert de una setting en `site_settings` (inserta o actualiza por `key`). */
export async function setSiteSetting(key: string, value: string): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) fail(`setSiteSetting(${key})`, error)
}

/**
 * Número de WhatsApp configurado por el admin en `site_settings`.
 * Solo servidor (usa la DAL). Si `whatsapp_number` está vacío, cae al
 * default de `siteConfig`.
 */
export async function getWhatsAppNumber(): Promise<string> {
  const settings = await getSiteSettings()
  return settings.whatsapp_number?.trim() || siteConfig.whatsappNumber
}

// ---------------------------------------------------------------------------
// Ajustes puntuales de productos
// ---------------------------------------------------------------------------

/** Marca o desmarca un producto como destacado. */
export async function setProductFeatured(id: string, featured: boolean): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin.from('products').update({ featured }).eq('id', id)
  if (error) fail(`setProductFeatured(${id})`, error)
}

/** Actualiza el precio de un producto. */
export async function updateProductPrice(id: string, price: number): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin.from('products').update({ price }).eq('id', id)
  if (error) fail(`updateProductPrice(${id})`, error)
}