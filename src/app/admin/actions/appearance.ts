'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { FormState } from '@/app/admin/actions/products'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import { setSiteSetting } from '@/lib/products-store'

/**
 * MUTACIONES DE APARIENCIA (Server Actions).
 *
 * Guarda los campos del hero de la portada en `site_settings`. Misma
 * convencion que el resto del panel: valida sesion, escribe via la DAL y
 * revalida las rutas afectadas para que la tienda se vea al instante.
 */

const HERO_FIELDS = [
  'hero_image',
  'hero_title',
  'hero_subtitle',
  'hero_tagline',
]

async function requireSession(): Promise<void> {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login?next=/admin')
}

/**
 * Guarda todos los campos del hero (imagen y textos). La firma con estado
 * previo es la que espera `useActionState` en el formulario.
 */
export async function saveHeroAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession()

  for (const field of HERO_FIELDS) {
    const value = String(formData.get(field) ?? '').trim()
    await setSiteSetting(field, value)
  }

  revalidatePath('/')
  revalidatePath('/admin/apariencia')
  redirect('/admin/apariencia?guardado=1')
}

/**
 * Guarda el numero y el mensaje predeterminado de WhatsApp de contacto en
 * `site_settings`. Revalida las rutas que arman links de WhatsApp (`/` y
 * `/products/[id]`) para que la tienda use los valores nuevos al instante.
 */
export async function saveContactAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession()

  const rawContacts = String(formData.get('contact_numbers') ?? '')
  let parsedContacts: unknown = []
  try {
    parsedContacts = JSON.parse(rawContacts)
  } catch {
    parsedContacts = []
  }

  const rows = (Array.isArray(parsedContacts) ? parsedContacts : [])
    .map((row) => {
      const value = (row ?? {}) as { name?: unknown; number?: unknown }
      return {
        name: String(value.name ?? '').trim().slice(0, 40),
        number: String(value.number ?? '').replace(/\D/g, ''),
      }
    })
    .filter((row) => row.number !== '')

  await setSiteSetting('contact_numbers', JSON.stringify(rows))

  const primaryNumber = rows[0]?.number
  if (primaryNumber) await setSiteSetting('whatsapp_number', primaryNumber)

  const whatsappMessage = String(formData.get('whatsapp_message') ?? '')
  await setSiteSetting('whatsapp_message', whatsappMessage)

  revalidatePath('/')
  revalidatePath('/products/[id]')
  revalidatePath('/admin/contacto')
  redirect('/admin/contacto?guardado=1')
}