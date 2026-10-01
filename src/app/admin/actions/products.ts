'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import {
  adjustStock,
  createProduct,
  restoreProduct,
  setProductFeatured,
  setProductVisibility,
  setSizeStock,
  softDeleteProduct,
  updateProduct,
  updateProductPrice,
} from '@/lib/products-store'
import type { Product, ProductCategory, ProductDraft, ProductSize } from '@/types/product'

/**
 * MUTACIONES DEL CATALOGO (Server Actions).
 *
 * Estas acciones son la "API de escritura" del panel admin. Todas:
 * 1. Verifican la sesion (una accion es alcanzable por POST directo, el proxy
 *    no alcanza como unica defensa).
 * 2. Validan la entrada.
 * 3. Escriben via la DAL (`src/lib/products-store.ts`).
 *
 * Cuando migres a una base de datos, solo cambia el cuerpo de estas funciones;
 * los formularios y la tabla no cambian.
 */

export type FormState = {
  ok?: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

const CATEGORIES: ProductCategory[] = ['seleccion', 'club']

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

async function requireSession(): Promise<void> {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login?next=/admin')
}

// ---------------------------------------------------------------------------
// Validacion
// ---------------------------------------------------------------------------

function parseDraft(payload: unknown): { draft: ProductDraft } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const raw = (payload ?? {}) as Record<string, unknown>

  const str = (key: string, fallback = ''): string => String(raw[key] ?? fallback).trim()
  const price = Number(raw.price)
  const featured = raw.featured === true || raw.featured === 'true'
  // Visible por defecto: solo se oculta si llega `false` explicito.
  const visible = raw.visible !== false && raw.visible !== 'false'

  const name = str('name')
  const team = str('team')
  const league = str('league')
  const season = str('season')
  const description = str('description')
  const category = str('category') as ProductCategory

  if (name.length < 3) errors.name = 'Poné un nombre de al menos 3 caracteres.'
  if (team.length < 2) errors.team = 'Indicá el equipo o selección.'
  if (!league) errors.league = 'Indicá la liga o la competición.'
  if (!season) errors.season = 'Indicá la temporada.'
  if (description.length < 10) errors.description = 'La descripción debe tener al menos 10 caracteres.'
  if (!CATEGORIES.includes(category)) errors.category = 'Elegí una categoría válida.'
  if (!Number.isFinite(price) || price < 0) errors.price = 'El precio debe ser un número mayor o igual a 0.'

  // Imagenes: strings no vacios, sin duplicados.
  const images = Array.isArray(raw.images)
    ? (raw.images as unknown[]).map((value) => String(value).trim()).filter(Boolean)
    : []
  const uniqueImages = [...new Set(images)]

  // Talles: Objects con `size` y `stock >= 0`, sin duplicados.
  const sizes: ProductSize[] = []
  if (Array.isArray(raw.sizes)) {
    for (const value of raw.sizes as unknown[]) {
      const entry = (value ?? {}) as Record<string, unknown>
      const size = String(entry.size ?? '').trim().toUpperCase()
      const stock = Math.trunc(Number(entry.stock))
      if (!size || !Number.isFinite(stock) || stock < 0) continue
      if (sizes.some((item) => item.size === size)) continue
      sizes.push({ size, stock })
    }
  }
  if (sizes.length === 0) errors.sizes = 'Cargá al menos un talle con su stock.'

  // Colores: hex valido o un color por defecto.
  const hex = /^#[0-9a-fA-F]{6}$/
  const primary = str('primaryColor', '#16a34a')
  const secondary = str('secondaryColor', '#ffffff')
  if (!hex.test(primary)) errors.primaryColor = 'Usá un color hexadecimal, por ejemplo #16a34a.'
  if (!hex.test(secondary)) errors.secondaryColor = 'Usá un color hexadecimal, por ejemplo #ffffff.'

  if (Object.keys(errors).length > 0) return { errors }

  return {
    draft: {
      name,
      team,
      category,
      league,
      season,
      description,
      price: Math.round(price),
      images: uniqueImages,
      sizes,
      colors: { primary, secondary },
      featured,
      visible,
    },
  }
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

/**
 * Crea o actualiza un producto.
 *
 * El formulario manda un unico campo `payload` con el draft en JSON: asi viajan
 * los arrays (imagenes, talles) sin aplanar el FormData campo por campo.
 */
export async function saveProductAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession()

  const id = String(formData.get('id') ?? '').trim()

  let payload: unknown
  try {
    payload = JSON.parse(String(formData.get('payload') ?? '{}'))
  } catch {
    return { error: 'No pudimos leer los datos del formulario. Recargá la página.' }
  }

  const parsed = parseDraft(payload)
  if ('errors' in parsed) {
    return { fieldErrors: parsed.errors, error: 'Revisá los campos marcados.' }
  }

  const saved: Product | null = id
    ? await updateProduct(id, parsed.draft)
    : await createProduct(parsed.draft)

  if (!saved) return { error: 'No encontramos la camiseta que intentás editar.' }

  // No hace falta revalidatePath: las paginas publicas son `force-dynamic`
  // porque leen el archivo. Si migras a una base con cache, este es el lugar
  // para sumar `revalidateTag('products')`.
  redirect(`/admin/productos/${saved.id}/editar?guardado=1`)
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = String(formData.get('id') ?? '')
  if (id) await softDeleteProduct(id)

  // El producto eliminado aparece en la seccion "Eliminados"; el count de la
  // nav se lee en el layout protegido, asi que invalidamos esa parte tambien.
  revalidatePath('/admin/eliminados')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin', 'layout')
  redirect('/admin/inventario?eliminado=1')
}

/** Restaura una camiseta eliminada desde `/admin/eliminados`. */
export async function restoreProductAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = String(formData.get('id') ?? '')
  if (id) await restoreProduct(id)

  revalidatePath('/admin/eliminados')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin', 'layout')
  redirect('/admin/eliminados?restaurado=1')
}

/** Suma una unidad a un talle (control rapido desde la tabla). */
export async function incrementStockAction(formData: FormData): Promise<void> {
  await requireSession()
  await adjustStock(String(formData.get('id') ?? ''), String(formData.get('size') ?? ''), 1)
  redirect('/admin/inventario')
}

/** Resta una unidad a un talle, sin bajar de 0. */
export async function decrementStockAction(formData: FormData): Promise<void> {
  await requireSession()
  await adjustStock(String(formData.get('id') ?? ''), String(formData.get('size') ?? ''), -1)
  redirect('/admin/inventario')
}

/** Muestra u oculta un producto en el catalogo publico (toggle rapido). */
export async function toggleVisibilityAction(formData: FormData): Promise<void> {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const visible = formData.get('visible') === 'true'
  await setProductVisibility(id, visible)
  revalidatePath('/admin/inventario')
}

/** Actualiza el precio de un producto (edicion rapida inline desde la tabla). */
export async function updatePriceAction(formData: FormData): Promise<void> {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const price = Math.round(Number(formData.get('price')))
  if (!Number.isFinite(price) || price < 0) return
  await updateProductPrice(id, price)
  revalidatePath('/admin/inventario')
}

/** Marca o desmarca un producto como destacado (toggle rapido). */
export async function setProductFeaturedAction(formData: FormData): Promise<void> {
  await requireSession()
  const id = formData.get('id') as string
  const featured = formData.get('featured') === 'true'
  await setProductFeatured(id, featured)
  revalidatePath('/admin/inventario')
}

/** Fija el stock de un talle a un valor exacto (popover de stock). */
export async function adjustStockAction(formData: FormData): Promise<void> {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const size = String(formData.get('size') ?? '')
  const stock = Math.max(0, Math.trunc(Number(formData.get('stock'))))
  if (!id || !size) return
  await setSizeStock(id, size, stock)
  revalidatePath('/admin/inventario')
}
