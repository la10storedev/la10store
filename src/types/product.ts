/**
 * Modelo de datos del catálogo.
 *
 * Diseñado para mapear 1:1 contra una tabla SQL (`products`) o una colección de
 * Supabase, de modo que migrar de los mocks a una base real sea únicamente un
 * cambio en la capa de acceso (`src/lib/products.ts`) y no en los componentes.
 *
 * Convenciones:
 * - `price` es un número plano en ARS, sin decimales. En la base real puede mapear a `numeric(12,2)`.
 * - `images` son rutas dentro de `public/` o URLs absolutas (Supabase / Cloudinary).
 * - `sizes` guarda el stock por talle para poder deshabilitar talles agotados en la UI.
 * - `colors` alimenta el placeholder SVG cuando todavía no hay foto real del producto.
 */

export type ProductCategory = 'seleccion' | 'club'

/** Paleta usada por el placeholder SVG cuando la imagen real aún no está cargada. */
export type ProductColors = {
  primary: string
  secondary: string
}

/** Disponibilidad de un talle puntual. */
export type ProductSize = {
  size: string
  stock: number
}

/**
 * Campos editables de un producto. `Product` agrega los campos que genera el
 * sistema (id, createdAt), así el formulario de admin trabaja con `ProductDraft`.
 */
export type ProductDraft = {
  name: string
  team: string
  category: ProductCategory
  league: string
  season: string
  description: string
  price: number
  images: string[]
  sizes: ProductSize[]
  colors: ProductColors
  featured: boolean
  /** Si la camiseta se muestra en el catálogo público (true por defecto). */
  visible: boolean
}

export type Product = ProductDraft & {
  id: string
  createdAt: string
}

/** Forma del archivo `src/data/products.json`. */
export type Catalog = {
  products: Product[]
  /** Lista administrada de equipos (crece al guardar un producto con uno nuevo). */
  teams: string[]
  /** Lista administrada de ligas o torneos. */
  leagues: string[]
}

/**
 * Asociación equipo↔ligas (por NOMBRE, sorted), leída de la tabla team_leagues.
 */
export type TeamLeagueMap = {
  /** team name -> nombres de ligas del equipo (orden alfabético es) */
  teamLeagues: Record<string, string[]>
  /** league name -> nombres de equipos que juegan esa liga */
  leagueTeams: Record<string, string[]>
}

/** Equipos y ligas/competiciones que corresponden a una categoría. */
export type CategoryTaxonomy = {
  teams: string[]
  leagues: string[]
  /**
   * Asociaciones equipo↔ligas de esta categoría (por NOMBRE). Las ligas tienen
   * categoría (`seleccion` | `club`) y los equipos se asocian vía ellas, así
   * que un equipo aparece bajo la categoría de cada liga asociada.
   */
  associations: TeamLeagueMap
}

/**
 * Opciones que alimentan los desplegables del panel, separadas por categoría:
 * una selección nunca ofrece equipos ni competiciones de clubes y viceversa.
 */
export type Taxonomy = Record<ProductCategory, CategoryTaxonomy>

/** Etiquetas de la UI para el estado de stock. */
export type StockStatus = 'disponible' | 'ultimas' | 'encargo'

/** Opciones de ordenamiento del catálogo. */
export type SortOrder = 'destacados' | 'nuevos' | 'precio-asc' | 'precio-desc' | 'nombre'

/** Filtros del catálogo, derivados de la query string. */
export type ProductFilters = {
  category?: string
  league?: string
  team?: string
  size?: string
  stock?: string
  q?: string
  sort?: SortOrder
}

/** Facetas para los controles de filtro (se calculan a partir de los productos). */
export type ProductFacets = {
  categories: ProductCategory[]
  leagues: string[]
  teams: string[]
  sizes: string[]
  /** Ligas/competiciones propias de cada categoría. */
  leaguesByCategory: Record<ProductCategory, string[]>
  /** Equipos propios de cada categoría. */
  teamsByCategory: Record<ProductCategory, string[]>
  /** Asociaciones equipo↔ligas (por nombre) para la cascada del filtro. */
  associations: TeamLeagueMap
}

// ---------------------------------------------------------------------------
// Equipos y ligas administrados (tablas `teams` / `leagues`)
// ---------------------------------------------------------------------------

/**
 * Equipo administrado en el panel (fila de la tabla `teams` sin soft delete).
 * `category` es la categoría de la columna homónima (agregada por la migración
 * `scripts/add-taxonomy-columns.ts`); `productCount` cuenta las camisetas
 * activas que lo usan.
 */
export type ManagedTeam = {
  id: string
  name: string
  category: ProductCategory
  active: boolean
  productCount: number
  /** IDs de las ligas activas asociadas al equipo. */
  leagueIds: string[]
}

/**
 * Liga administrada en el panel (fila de la tabla `leagues` sin soft delete).
 * `productCount` cuenta las camisetas activas; `teamCount` los equipos
 * asociados activos en `team_leagues`.
 */
export type ManagedLeague = {
  id: string
  name: string
  category: ProductCategory
  active: boolean
  productCount: number
  teamCount: number
}

/** Equipo en la papelera (soft delete: `deleted_at` seteado). */
export type DeletedTeam = {
  id: string
  name: string
  category: ProductCategory
  deletedAt: string
  /** Camisetas en CUALQUIER estado que referencian al equipo. */
  productCount: number
}

/** Liga en la papelera (soft delete: `deleted_at` seteado). */
export type DeletedLeague = {
  id: string
  name: string
  category: ProductCategory
  deletedAt: string
  /** Camisetas en CUALQUIER estado que referencian a la liga. */
  productCount: number
  teamCount: number
}

/** Conteos de la papelera unificada (productos + equipos + ligas). */
export type TrashCounts = {
  products: number
  teams: number
  leagues: number
  total: number
}

/**
 * Resultado de una mutación de la taxonomía (equipos/ligas).
 *
 * - `has_products`: soft delete bloqueado porque el registro tiene camisetas
 *   activas (`count`).
 * - `referenced`: hard delete bloqueado porque el registro tiene camisetas en
 *   cualquier estado (`count`).
 * - `duplicate`: ya existe una fila con el id derivado del nombre.
 * - `not_found`: no existe la fila a modificar.
 * - `error`: fallo inesperado (la DAL nunca lanza en mutaciones).
 */
export type TaxonomyMutationResult =
  | { ok: true }
  | {
      ok: false
      reason: 'has_products' | 'referenced' | 'duplicate' | 'not_found' | 'error'
      count?: number
    }
