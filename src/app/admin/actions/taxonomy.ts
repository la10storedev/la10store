'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import {
  createLeague,
  createTeam,
  hardDeleteLeague,
  hardDeleteProduct,
  hardDeleteTeam,
  renameLeague,
  renameTeam,
  restoreLeague,
  restoreTeam,
  setLeagueActive,
  setTeamActive,
  setTeamLeagues,
  softDeleteLeague,
  softDeleteTeam,
} from '@/lib/taxonomy-store'
import type { ProductCategory, TaxonomyMutationResult } from '@/types/product'

/**
 * MUTACIONES DE EQUIPOS, LIGAS Y PAPELERA (Server Actions).
 *
 * Complementa a `actions/products.ts`: acá viven las operaciones sobre las
 * tablas maestras `teams`/`leagues`, sus asociaciones y la papelera unificada
 * (`/admin/equipos` y `/admin/eliminados`).
 *
 * Todas:
 * 1. Verifican la sesión (una acción es alcanzable por POST directo, el proxy
 *    no alcanza como única defensa).
 * 2. Leen los campos del FormData.
 * 3. Escriben vía la DAL (`src/lib/taxonomy-store.ts`), que nunca lanza.
 * 4. Revalidan las páginas afectadas y redirigen con un código `ok`/`error`
 *    (y `n` cuando aplica) que la UI muestra como feedback.
 */

const CATEGORIES: ProductCategory[] = ['seleccion', 'club']

/** Páginas que muestran equipos, ligas o la papelera (incluye nav y catálogo). */
function revalidateTaxonomy(): void {
  revalidatePath('/admin/equipos')
  revalidatePath('/admin/eliminados')
  revalidatePath('/admin', 'layout')
  revalidatePath('/')
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

async function requireSession(): Promise<void> {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login?next=/admin')
}

// ---------------------------------------------------------------------------
// Helpers de redirección
// ---------------------------------------------------------------------------

function readId(formData: FormData): string {
  return String(formData.get('id') ?? '').trim()
}

function readName(formData: FormData): string {
  return String(formData.get('name') ?? '').trim()
}

function readCategory(formData: FormData): ProductCategory | null {
  const category = String(formData.get('category') ?? '').trim() as ProductCategory
  return CATEGORIES.includes(category) ? category : null
}

const ERROR_RESULT: TaxonomyMutationResult = { ok: false, reason: 'error' }

/**
 * Traduce un `TaxonomyMutationResult` a la query string de feedback:
 * `/base?ok=CODE` o `/base?error=CODE[&n=count]`. Siempre redirige (never).
 */
function redirectResult(
  result: TaxonomyMutationResult,
  options: { base: '/admin/equipos' | '/admin/eliminados'; okCode: string },
): never {
  const { base, okCode } = options
  if (result.ok) redirect(`${base}?ok=${okCode}`)

  switch (result.reason) {
    case 'has_products':
      redirect(`${base}?error=tiene_camisetas&n=${result.count ?? 0}`)
    case 'referenced':
      redirect(`${base}?error=referenciado&n=${result.count ?? 0}`)
    case 'duplicate':
      redirect(`${base}?error=duplicado`)
    case 'not_found':
      redirect(`${base}?error=no_encontrado`)
    default:
      redirect(`${base}?error=generico`)
  }
}

// ---------------------------------------------------------------------------
// Crear
// ---------------------------------------------------------------------------

/** Crea un equipo en `/admin/equipos`. Campos: `name`, `category`. */
export async function createTeamAction(formData: FormData): Promise<void> {
  await requireSession()

  const name = readName(formData)
  const category = readCategory(formData)
  const result =
    name.length >= 2 && category ? await createTeam(name, category) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/equipos', okCode: 'creado' })
}

/** Crea una liga en `/admin/equipos`. Campos: `name`, `category`. */
export async function createLeagueAction(formData: FormData): Promise<void> {
  await requireSession()

  const name = readName(formData)
  const category = readCategory(formData)
  const result =
    name.length >= 2 && category ? await createLeague(name, category) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/equipos', okCode: 'creado' })
}

// ---------------------------------------------------------------------------
// Renombrar
// ---------------------------------------------------------------------------

/** Renombra un equipo. Campos: `id`, `name`. */
export async function renameTeamAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const name = readName(formData)
  const result = id && name.length >= 2 ? await renameTeam(id, name) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/equipos', okCode: 'renombrado' })
}

/** Renombra una liga. Campos: `id`, `name`. */
export async function renameLeagueAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const name = readName(formData)
  const result = id && name.length >= 2 ? await renameLeague(id, name) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/equipos', okCode: 'renombrado' })
}

// ---------------------------------------------------------------------------
// Activar / desactivar
// ---------------------------------------------------------------------------

/** Activa o desactiva un equipo. Campos: `id`, `active` ('true' | 'false'). */
export async function toggleTeamActiveAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const active = formData.get('active') === 'true'
  const result = id ? await setTeamActive(id, active) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, {
    base: '/admin/equipos',
    okCode: active ? 'activado' : 'desactivado',
  })
}

/** Activa o desactiva una liga. Campos: `id`, `active` ('true' | 'false'). */
export async function toggleLeagueActiveAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const active = formData.get('active') === 'true'
  const result = id ? await setLeagueActive(id, active) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, {
    base: '/admin/equipos',
    okCode: active ? 'activado' : 'desactivado',
  })
}

// ---------------------------------------------------------------------------
// Soft delete (a la papelera)
// ---------------------------------------------------------------------------

/** Mueve un equipo a la papelera (si no tiene camisetas activas). Campo: `id`. */
export async function deleteTeamAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const result = id ? await softDeleteTeam(id) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/equipos', okCode: 'eliminado' })
}

/** Mueve una liga a la papelera (si no tiene camisetas activas). Campo: `id`. */
export async function deleteLeagueAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const result = id ? await softDeleteLeague(id) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/equipos', okCode: 'eliminado' })
}

// ---------------------------------------------------------------------------
// Restaurar desde la papelera
// ---------------------------------------------------------------------------

/** Restaura un equipo desde `/admin/eliminados`. Campo: `id`. */
export async function restoreTeamAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const result = id ? await restoreTeam(id) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/eliminados', okCode: 'restaurado' })
}

/** Restaura una liga desde `/admin/eliminados`. Campo: `id`. */
export async function restoreLeagueAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const result = id ? await restoreLeague(id) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/eliminados', okCode: 'restaurado' })
}

// ---------------------------------------------------------------------------
// Purgado definitivo (hard delete) desde la papelera
// ---------------------------------------------------------------------------

/** Purgá un equipo definitivamente (solo si no tiene camisetas). Campo: `id`. */
export async function hardDeleteTeamAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const result = id ? await hardDeleteTeam(id) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/eliminados', okCode: 'purgado' })
}

/** Purgá una liga definitivamente (solo si no tiene camisetas). Campo: `id`. */
export async function hardDeleteLeagueAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const result = id ? await hardDeleteLeague(id) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/eliminados', okCode: 'purgado' })
}

/** Purgá una camiseta definitivamente desde la papelera. Campo: `id`. */
export async function hardDeleteProductAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = readId(formData)
  const result = id ? await hardDeleteProduct(id) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/eliminados', okCode: 'purgado' })
}

// ---------------------------------------------------------------------------
// Asociaciones equipo <-> ligas
// ---------------------------------------------------------------------------

/**
 * Fija las ligas de un equipo. Campos: `teamId` + `getAll('leagueIds')`.
 * Los ids no deseados se desactivan (no se borran); los deseados se activan.
 */
export async function setTeamLeaguesAction(formData: FormData): Promise<void> {
  await requireSession()

  const teamId = readId(formData)
  const leagueIds = formData.getAll('leagueIds').map((value) => String(value))
  const result = teamId ? await setTeamLeagues(teamId, leagueIds) : ERROR_RESULT

  revalidateTaxonomy()
  redirectResult(result, { base: '/admin/equipos', okCode: 'asociaciones' })
}