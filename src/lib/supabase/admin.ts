import { createClient } from '@supabase/supabase-js'

/**
 * Cliente admin con la secret key para operaciones privilegiadas (bypassa RLS).
 *
 * Solo debe usarse en el servidor: la secret key no tiene prefijo NEXT_PUBLIC_,
 * asi que Next.js falla si alguien intenta importarla desde el cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  )
}