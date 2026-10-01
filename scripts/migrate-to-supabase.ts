/**
 * MIGRACION DE `src/data/products.json` + `public/img/` A SUPABASE + CLOUDINARY.
 *
 * Uso:
 *   npx tsx scripts/migrate-to-supabase.ts
 *
 * Pasos:
 *   1. Carga las variables de entorno desde `.env.local`.
 *   2. Inserta teams y leagues (upsert por id = slug del nombre).
 *   3. Por cada producto: sube sus imagenes de `public/img/` a Cloudinary y
 *      inserta/actualiza la fila en `products` con las URLs resultantes.
 *
 * Es idempotente: reejecutarlo no duplica datos (upserts).
 *
 * Nota: usa imports relativos (no alias `@/`) para que corra directo con tsx
 * y solo carga env al inicio (antes de usar Cloudinary).
 */
import { readFileSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Catalog, ProductCategory } from '../src/types/product'
import { createAdminClient } from '../src/lib/supabase/admin'
import { uploadBuffer } from '../src/lib/cloudinary'

/** Carga `.env.local` sin depender de dotenv (mismo formato que Next). */
function loadEnvFile(file = '.env.local'): void {
  try {
    const raw = readFileSync(path.join(process.cwd(), file), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      // No pisa variables que ya estan cargadas en el entorno.
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // Si no existe el archivo, se asume que las variables ya estan cargadas.
  }
}

/**
 * Copia local de `slugify` (identica a `src/lib/products-store.ts`), para no
 * depender del alias `@/` al correr fuera de Next con tsx. Genera el mismo id
 * que usaria la app al crear teams/leagues nuevos.
 */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * Sube una imagen local de `public/img/` a Cloudinary y devuelve su URL.
 * Si la imagen ya es una URL remota, la conserva. Si el archivo no existe o el
 * upload falla, devuelve '' (URL vacia) y loguea el motivo.
 */
async function uploadLocalImage(imagePath: string, productId: string, index: number): Promise<string> {
  if (isRemoteUrl(imagePath)) return imagePath

  const filename = imagePath.replace(/^\/?img\//, '')
  const filePath = path.join(process.cwd(), 'public', 'img', filename)

  let buffer: Buffer
  try {
    buffer = await fs.readFile(filePath)
  } catch {
    console.warn(`  [img] no existe en public/img/, se deja URL vacia: ${imagePath}`)
    return ''
  }

  const publicId = `${productId}-${index + 1}`
  try {
    const url = await uploadBuffer(buffer, publicId)
    console.log(`  [img] subida OK -> ${url}`)
    return url
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`  [img] error subiendo ${imagePath}: ${message}`)
    return ''
  }
}

async function main(): Promise<void> {
  loadEnvFile()

  const admin = createAdminClient()
  const dataPath = path.join(process.cwd(), 'src', 'data', 'products.json')
  const catalog = JSON.parse(await fs.readFile(dataPath, 'utf8')) as Catalog

  const started = Date.now()
  let okTeams = 0
  let okLeagues = 0
  let okProducts = 0
  let failProducts = 0

  console.log(`[1/3] Migrando equipos...`)
  // Teams: union de la lista administrada y los productos.
  const teamNames = new Set<string>([...catalog.teams, ...catalog.products.map((p) => p.team)])
  for (const name of teamNames) {
    const id = slugify(name) || 'equipo'
    const { error } = await admin.from('teams').upsert({ id, name }, { onConflict: 'id' })
    if (error) {
      console.error(`[teams] error ${name} (${id}): ${error.message}`)
    } else {
      okTeams += 1
      console.log(`[teams] OK ${name} -> ${id}`)
    }
  }

  console.log(`\n[2/3] Migrando ligas...`)
  // Leagues: la categoria se deriva del primer producto que la usa.
  const leagueCategory = new Map<string, ProductCategory>()
  for (const product of catalog.products) {
    if (!leagueCategory.has(product.league)) {
      leagueCategory.set(product.league, product.category)
    }
  }
  const leagueNames = new Set<string>([...catalog.leagues, ...catalog.products.map((p) => p.league)])
  for (const name of leagueNames) {
    const id = slugify(name) || 'liga'
    const category = leagueCategory.get(name) ?? 'club'
    const { error } = await admin
      .from('leagues')
      .upsert({ id, name, category }, { onConflict: 'id' })
    if (error) {
      console.error(`[leagues] error ${name} (${id}): ${error.message}`)
    } else {
      okLeagues += 1
      console.log(`[leagues] OK ${name} (${category}) -> ${id}`)
    }
  }

  console.log(`\n[3/3] Migrando productos (imagenes a Cloudinary)...`)
  for (const product of catalog.products) {
    const team_id = slugify(product.team) || 'equipo'
    const league_id = slugify(product.league) || 'liga'

    const images: string[] = []
    for (let i = 0; i < product.images.length; i++) {
      const uploaded = await uploadLocalImage(product.images[i], product.id, i)
      images.push(uploaded)
    }

    const { error } = await admin.from('products').upsert(
      {
        id: product.id,
        name: product.name,
        team_id,
        category: product.category,
        league_id,
        season: product.season,
        description: product.description,
        price: product.price,
        images,
        sizes: product.sizes,
        colors: product.colors,
        featured: product.featured,
        visible: product.visible,
        created_at: product.createdAt,
      },
      { onConflict: 'id' },
    )

    if (error) {
      failProducts += 1
      console.error(`[products] error ${product.id} (${product.name}): ${error.message}`)
    } else {
      okProducts += 1
      console.log(`[products] OK ${product.id} (${product.name})`)
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log('\n--- Resumen ---')
  console.log(`Teams:    ${okTeams} OK`)
  console.log(`Leagues:  ${okLeagues} OK`)
  console.log(`Productos: ${okProducts} OK, ${failProducts} con error`)
  console.log(`Tiempo:   ${elapsed}s`)
  if (failProducts > 0) {
    console.log('Migracion terminada con errores (revisar logs de arriba).')
    process.exitCode = 1
  } else {
    console.log('Migracion completada.')
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[migracion] fallo inesperado: ${message}`)
  process.exit(1)
})