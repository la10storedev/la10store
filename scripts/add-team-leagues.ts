/**
 * Crea la tabla `team_leagues` (relacion N:M equipo <-> liga) y la siembra con
 * las asociaciones derivadas de TODOS los productos (incluidos ocultos y
 * eliminados: dato maestro completo). Idempotente: CREATE TABLE IF NOT EXISTS +
 * ON CONFLICT DO NOTHING.
 *
 * Uso:
 *   npx tsx scripts/add-team-leagues.ts
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
  CREATE TABLE IF NOT EXISTS team_leagues (
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, league_id)
  );
  INSERT INTO team_leagues (team_id, league_id)
  SELECT DISTINCT p.team_id, p.league_id
  FROM products p
  WHERE p.team_id IS NOT NULL AND p.league_id IS NOT NULL
  ON CONFLICT DO NOTHING;
`

async function main() {
  console.log('🔧 Creando tabla team_leagues y sembrando asociaciones...')

  const { error } = await admin.rpc('exec_sql', { sql: SQL })

  if (error) {
    console.log('⚠️  RPC exec_sql no disponible, ejecutá el SQL manualmente en Supabase SQL Editor:')
    console.log(SQL + ';')
    process.exitCode = 1
    return
  }

  console.log('✅ Tabla team_leagues creada y sembrada desde products.')
}

main().catch(console.error)