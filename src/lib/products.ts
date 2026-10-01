import { normalize } from '@/lib/format'
import type {
  Product,
  ProductCategory,
  ProductFacets,
  ProductFilters,
  ProductSize,
  SortOrder,
  StockStatus,
  Taxonomy,
} from '@/types/product'

/**
 * LOGICA DE DOMINIO ( pura, sin I/O ).
 *
 * Este archivo no toca el sistema de archivos ni variables de entorno, asi que
 * puede importarse desde Server Components, Client Components y Server Actions.
 * El acceso a los datos vive en `src/lib/products-store.ts`.
 */

/** Orden canonico de talles. Los talles fuera de esta lista van al final. */
export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL']

export const CATEGORIES: ProductCategory[] = ['seleccion', 'club']

export const categoryLabels: Record<ProductCategory, string> = {
  seleccion: 'Selecciones',
  club: 'Clubes',
}

export const SORT_LABELS: Record<SortOrder, string> = {
  destacados: 'Destacados',
  nuevos: 'Novedades',
  'precio-asc': 'Precio: menor a mayor',
  'precio-desc': 'Precio: mayor a menor',
  nombre: 'Nombre (A-Z)',
}

/** Umbral para mostrar "ultimas unidades" en lugar de "disponible". */
export const LOW_STOCK_THRESHOLD = 3

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

export function totalStock(product: Product): number {
  return product.sizes.reduce((acc, size) => acc + Math.max(0, size.stock), 0)
}

export function stockStatus(stock: number): StockStatus {
  // Sin unidades = "encargo": se puede pedir, se coordina por WhatsApp.
  if (stock <= 0) return 'encargo'
  if (stock <= LOW_STOCK_THRESHOLD) return 'ultimas'
  return 'disponible'
}

export function productStockStatus(product: Product): StockStatus {
  return stockStatus(totalStock(product))
}

export const stockStatusLabels: Record<StockStatus, string> = {
  disponible: 'En stock',
  ultimas: 'Ultimas unidades',
  encargo: 'Encargo',
}

/** Talles con al menos una unidad disponible. */
export function availableSizes(product: Product): ProductSize[] {
  return product.sizes.filter((size) => size.stock > 0)
}

// ---------------------------------------------------------------------------
// Facetas (equipos, ligas, talles) derivadas de los productos
// ---------------------------------------------------------------------------

function sortSizes(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a)
  const ib = SIZE_ORDER.indexOf(b)
  if (ia === -1 && ib === -1) return a.localeCompare(b)
  if (ia === -1) return 1
  if (ib === -1) return -1
  return ia - ib
}

function sortByLabel<T>(values: T[], label: (value: T) => string): T[] {
  return [...values].sort((a, b) => label(a).localeCompare(label(b), 'es'))
}

/**
 * Agrupa equipos y ligas/competiciones por categoría, derivándolos de los
 * productos existentes.
 *
 * Una liga aparece bajo selección o club según los productos que la usan. Así
 * el panel y los filtros nunca ofrecen competiciones de clubes al cargar una
 * selección (ni al revés).
 */
export function getTaxonomyByCategory(products: Product[]): Taxonomy {
  const buckets = (): Record<ProductCategory, string[]> => ({ seleccion: [], club: [] })
  const teams = buckets()
  const leagues = buckets()

  for (const product of products) {
    teams[product.category] = addTaxonomyValue(teams[product.category], product.team)
    leagues[product.category] = addTaxonomyValue(leagues[product.category], product.league)
  }

  return {
    seleccion: { teams: teams.seleccion, leagues: leagues.seleccion },
    club: { teams: teams.club, leagues: leagues.club },
  }
}

export function getFacets(products: Product[]): ProductFacets {
  const leagues = new Set<string>()
  const teams = new Set<string>()
  const sizes = new Set<string>()

  for (const product of products) {
    if (product.league) leagues.add(product.league)
    if (product.team) teams.add(product.team)
    for (const size of product.sizes) sizes.add(size.size)
  }

  const byCategory = getTaxonomyByCategory(products)

  return {
    categories: CATEGORIES.filter((category) =>
      products.some((product) => product.category === category),
    ),
    leagues: sortByLabel([...leagues], (value) => value),
    teams: sortByLabel([...teams], (value) => value),
    sizes: [...sizes].sort(sortSizes),
    leaguesByCategory: {
      seleccion: byCategory.seleccion.leagues,
      club: byCategory.club.leagues,
    },
    teamsByCategory: {
      seleccion: byCategory.seleccion.teams,
      club: byCategory.club.teams,
    },
  }
}

/**
 * Devuelve una lista administrada (equipos o ligas) con `value` asegurado.
 *
 * Se usa para dos cosas:
 * - Al guardar un producto, para incorporar su equipo/liga a la lista.
 * - Al editar, para mostrar el valor actual aunque todavia no este en la lista.
 *
 * Compara sin distinguir mayusculas ni acentos, no duplica y mantiene el orden
 * alfabetico. Es pura: no escribe nada.
 */
export function addTaxonomyValue(list: string[], value: string): string[] {
  const incoming = value.trim()
  if (!incoming) return list
  if (list.some((item) => normalize(item) === normalize(incoming))) return list
  return sortByLabel([...list, incoming], (item) => item)
}

// ---------------------------------------------------------------------------
// Filtros y ordenamiento
// ---------------------------------------------------------------------------

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const needle = filters.q ? normalize(filters.q.trim()) : null

  return products.filter((product) => {
    if (filters.category && product.category !== filters.category) return false
    if (filters.league && product.league !== filters.league) return false
    if (filters.team && product.team !== filters.team) return false

    if (filters.size) {
      const match = product.sizes.find((size) => size.size === filters.size)
      if (!match || match.stock <= 0) return false
    }

    if (filters.stock) {
      const status = productStockStatus(product)
      // Sin stock = "encargo". Se conserva "agotado" como alias por URLs viejas.
      const noStock = status === 'encargo'
      if ((filters.stock === 'encargo' || filters.stock === 'agotado') && !noStock) return false
      if (filters.stock === 'disponible' && noStock) return false
    }

    if (needle) {
      const haystack = normalize(
        [product.name, product.team, product.league, product.season, product.description].join(' '),
      )
      if (!haystack.includes(needle)) return false
    }

    return true
  })
}

export function sortProducts(products: Product[], sort: SortOrder = 'destacados'): Product[] {
  const sorted = [...products]

  switch (sort) {
    case 'precio-asc':
      return sorted.sort((a, b) => a.price - b.price)
    case 'precio-desc':
      return sorted.sort((a, b) => b.price - a.price)
    case 'nombre':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    case 'nuevos':
      return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    case 'destacados':
    default:
      // Destacados primero; a igual categoria, lo mas nuevo primero.
      return sorted.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1
        return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      })
  }
}

/** `true` si hay al menos un filtro activo (excluye el ordenamiento). */
export function hasActiveFilters(filters: ProductFilters): boolean {
  return Boolean(filters.category || filters.league || filters.team || filters.size || filters.stock || filters.q)
}

/**
 * Traduce la query string de la pagina de catalogo a `ProductFilters`.
 * `searchParams` en Next 16 llega como Promise y sus valores pueden ser
 * `string | string[] | undefined`.
 */
export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ProductFilters {
  const read = (key: string): string | undefined => {
    const value = searchParams[key]
    if (Array.isArray(value)) return value[0]
    return value
  }

  const rawSort = read('sort') as SortOrder | undefined
  const sort = rawSort && rawSort in SORT_LABELS ? rawSort : 'destacados'

  return {
    category: read('category'),
    league: read('league'),
    team: read('team'),
    size: read('size'),
    stock: read('stock'),
    q: read('q'),
    sort,
  }
}
