import { ContactForm } from '@/components/admin/ContactForm'
import { getSiteSettings } from '@/lib/products-store'

/**
 * PAGINA CONTACTO DEL PANEL.
 *
 * Server Component: lee el numero de WhatsApp de `site_settings` y se lo pasa
 * al formulario client (`ContactForm`) que lo edita y guarda via Server Action.
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>
}) {
  const [settings, { guardado }] = await Promise.all([getSiteSettings(), searchParams])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Contacto</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          Configura el numero de WhatsApp que reciben las consultas de la tienda.
          Los cambios se reflejan al instante en todos los botones de contacto.
        </p>
      </div>

      {guardado ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Numero de WhatsApp guardado. Ya se refleja en la tienda.
        </p>
      ) : null}

      <ContactForm whatsappNumber={settings.whatsapp_number ?? ''} />
    </div>
  )
}
