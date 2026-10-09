'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import { setSiteSetting } from '@/lib/products-store'
import type { ShippingIcon, ShippingItem } from '@/lib/products-store'

/**
 * MUTACIONES DE ENVIO Y PAGOS (Server Actions).
 *
 * Guarda el titulo y los items de la seccion "Envio y pagos" en
 * `site_settings`. Misma convencion que el resto del panel: valida sesion,
 * escribe via la DAL y revalida las rutas afectadas.
 */

const SHIPPING_ICONS: ShippingIcon[] = [
  'truck',
  'package',
  'cash',
  'wallet',
  'card',
  'moto',
  'store',
  'map-pin',
  'clock',
  'repeat',
  'shield',
  'percent',
  'chat',
]

async function requireSession(): Promise<void> {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login?next=/admin')
}

/**
 * Guarda el titulo y los items de "Envio y pagos". La firma con estado previo
 * es la que espera `useActionState` en el formulario.
 */
export async function saveShippingAction(
  _previous: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireSession()

  const title = String(formData.get('shipping_title') ?? '').trim() || 'Envío y pagos'
  // El JSON se guarda tal cual lo serializa el formulario: no se trimea.
  const rawItems = String(formData.get('shipping_items') ?? '')

  let parsedItems: unknown
  try {
    parsedItems = JSON.parse(rawItems)
  } catch {
    return { error: 'No se pudo leer la lista de items.' }
  }

  if (!Array.isArray(parsedItems)) {
    return { error: 'No se pudo leer la lista de items.' }
  }

  const items: ShippingItem[] = parsedItems
    .map((row) => {
      const value = (row ?? {}) as { title?: unknown; body?: unknown; icon?: unknown }
      return {
        title: String(value.title ?? '').trim().slice(0, 80),
        body: String(value.body ?? '').trim().slice(0, 240),
        icon: String(value.icon ?? ''),
      }
    })
    .filter(
      (item): item is ShippingItem =>
        item.title !== '' &&
        item.body !== '' &&
        SHIPPING_ICONS.includes(item.icon as ShippingIcon),
    )

  await setSiteSetting('shipping_title', title)
  await setSiteSetting('shipping_items', JSON.stringify(items))

  revalidatePath('/')
  revalidatePath('/admin/apariencia')
  redirect('/admin/apariencia?guardado=envios')
}
