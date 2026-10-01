/**
 * Agrega las columnas de taxonomía a `teams` y `leagues`:
 * - `teams.category TEXT` (con backfill desde `products` y default 'club').
 * - `teams.deleted_at TIMESTAMPTZ` (soft delete de equipos).
 * - `leagues.deleted_at TIMESTAMPTZ` (soft delete de ligas).
 *
 * Idempotente: usa `ADD COLUMN IF NOT EXISTS` y el backfill solo toca las filas
 * con `category IS NULL`, así que reejecutarlo es seguro.
 *
 * Uso:
 *   npx tsx scripts/add-taxonomy-columns.ts
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
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS category TEXT;
  UPDATE teams t SET category = COALESCE((SELECT p.category FROM products p WHERE p.team_id=t.id GROUP BY p.category ORDER BY COUNT(*) DESC LIMIT 1),'club') WHERE t.category IS NULL;
  ALTER TABLE teams ALTER COLUMN category SET DEFAULT 'club';
  ALTER TABLE teams ALTER COLUMN category SET NOT NULL;
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE leagues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
`

async function main() {
  console.log('🔧 Agregando columnas de taxonomía (category, deleted_at) a teams/leagues...')

  const { error } = await admin.rpc('exec_sql', { sql: SQL })

  if (error) {
    console.log('⚠️  RPC exec_sql no disponible, ejecutá el SQL manualmente en Supabase SQL Editor:')
    console.log(SQL + ';')
    process.exitCode = 1
    return
  }

  console.log('✅ Columnas de taxonomía agregadas a teams y leagues.')
}

main().catch(console.error)