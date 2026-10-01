/**
 * Agrega la columna `deleted_at TIMESTAMPTZ` (nullable) a `products` para el
 * soft delete del panel admin. Idempotente: usar IF NOT EXISTS.
 *
 * Uso:
 *   npx tsx scripts/add-products-deleted-at.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'path'

// Cargar .env.local manualmente (sin dotenv)
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) continue
  const key = trimmed.slice(0, eqIndex)
  const value = trimmed.slice(eqIndex + 1)
  process.env[key] = value
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY')
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false },
})

const SQL = `
  ALTER TABLE products
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
`

async function main() {
  console.log('🔧 Agregando columna deleted_at a products...')

  const { error } = await admin.rpc('exec_sql', { sql: SQL })

  if (error) {
    console.log('⚠️  RPC exec_sql no disponible, ejecutá el SQL manualmente en Supabase SQL Editor:')
    console.log(SQL + ';')
    process.exitCode = 1
    return
  }

  console.log('✅ Columna deleted_at agregada a products.')
}

main().catch(console.error)