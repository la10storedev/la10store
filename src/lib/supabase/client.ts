import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente del browser para componentes interactivos (auth, formularios).
 * Nunca importar desde Server Components ni Server Actions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}