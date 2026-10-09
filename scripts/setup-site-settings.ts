/**
 * Crea la tabla site_settings en Supabase e inserta los valores iniciales del hero.
 * Idempotente: si ya existe, no falla.
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

async function main() {
  console.log('🔧 Creando tabla site_settings...')

  // CREATE TABLE IF NOT EXISTS
  const { error: createError } = await admin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  })

  // Si rpc exec_sql no existe, usar approach alternativo
  if (createError) {
    console.log('⚠️  RPC exec_sql no disponible, usando approach alternativo...')
    
    // Intentar insertar directamente (la tabla debe existir)
    // Si no existe, el usuario debe crearla manualmente en Supabase SQL Editor
  }

  // Valores iniciales del hero
  const defaults = [
    { key: 'hero_image', value: '' },
    { key: 'hero_title', value: 'Camisetas de selecciones y clubes' },
    { key: 'hero_subtitle', value: 'Elegi tu talle y consultanos por WhatsApp. Te confirmamos disponibilidad, medidas y forma de pago. Sin carrito, sin pagos online: hablamos directo.' },
    { key: 'hero_tagline', value: 'Tu camiseta, tu pasión' },
    { key: 'hero_cta_text', value: 'Ver catalogo' },
    { key: 'hero_cta_link', value: '#catalogo' },
    { key: 'whatsapp_number', value: '5491123456789' },
    { key: 'whatsapp_message', value: 'Hola! Quiero consultar por la camiseta "{productName}"\nTalle: {size}\nPrecio de referencia: {price}\nRef: {productId}\nEsta disponible?' },
    { key: 'contact_numbers', value: '[]' },
    { key: 'shipping_title', value: 'Envío y pagos' },
    { key: 'shipping_items', value: '[]' },
    { key: 'footer_description', value: 'Camisetas de fútbol de selecciones y clubes. Enviamos a todo el país y coordinamos la compra directa por WhatsApp.' },
    { key: 'footer_email', value: 'holo@tumarca.com' },
    { key: 'footer_instagram_url', value: 'https://instagram.com/tu-marca' },
    { key: 'footer_copyright', value: '© {year} {name}. Catalogo informativo: no procesamos pagos online, la compra se coordina por WhatsApp.' },
  ]

  console.log('📝 Insertando valores iniciales...')
  
  for (const setting of defaults) {
    const { error } = await admin
      .from('site_settings')
      .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' })

    if (error) {
      console.error(`❌ Error insertando ${setting.key}:`, error.message)
    } else {
      console.log(`✅ ${setting.key}`)
    }
  }

  console.log('\n✨ Setup completado. Verificá en Supabase SQL Editor si la tabla no fue creada automáticamente.')
  console.log('\nSQL manual (si es necesario):')
  console.log(`
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES
  ('hero_image', ''),
  ('hero_title', 'Camisetas de selecciones y clubes'),
  ('hero_subtitle', 'Elegi tu talle y consultanos por WhatsApp. Te confirmamos disponibilidad, medidas y forma de pago. Sin carrito, sin pagos online: hablamos directo.'),
  ('hero_tagline', 'Tu camiseta, tu pasión'),
  ('hero_cta_text', 'Ver catalogo'),
  ('hero_cta_link', '#catalogo'),
  ('whatsapp_number', '5491123456789'),
  ('whatsapp_message', 'Hola! Quiero consultar por la camiseta "{productName}"\nTalle: {size}\nPrecio de referencia: {price}\nRef: {productId}\nEsta disponible?'),
  ('contact_numbers', '[]'),
  ('shipping_title', 'Envío y pagos'),
  ('shipping_items', '[]'),
  ('footer_description', 'Camisetas de fútbol de selecciones y clubes. Enviamos a todo el país y coordinamos la compra directa por WhatsApp.'),
  ('footer_email', 'holo@tumarca.com'),
  ('footer_instagram_url', 'https://instagram.com/tu-marca'),
  ('footer_copyright', '© {year} {name}. Catalogo informativo: no procesamos pagos online, la compra se coordina por WhatsApp.')
ON CONFLICT (key) DO NOTHING;
  `)
}

main().catch(console.error)
