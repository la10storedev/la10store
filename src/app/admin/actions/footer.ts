'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { FormState } from '@/app/admin/actions/products'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import { setSiteSetting } from '@/lib/products-store'

/**
 * MUTACIONES DEL FOOTER (Server Actions).
 *
 * Guarda el contenido configurable del pie de pagina en `site_settings`:
 * descripcion, email, Instagram y copyright.
 */

async function requireSession(): Promise<void> {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login?next=/admin')
}

/**
 * Guarda todo el contenido del footer. La firma con estado previo es la que
 * espera `useActionState` en el formulario.
 */
export async function saveFooterAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession()

  const description = String(formData.get('footer_description') ?? '').trim()
  const email = String(formData.get('footer_email') ?? '').trim()
  const instagramUrl = String(formData.get('footer_instagram_url') ?? '').trim()
  // El copyright conserva los espacios tal cual los escribe el admin.
  const copyright = String(formData.get('footer_copyright') ?? '')

  await setSiteSetting('footer_description', description)
  await setSiteSetting('footer_email', email)
  await setSiteSetting('footer_instagram_url', instagramUrl)
  await setSiteSetting('footer_copyright', copyright)

  revalidatePath('/')
  revalidatePath('/admin/apariencia')
  redirect('/admin/apariencia?guardado=footer')
}
