import { ContactForm } from '@/components/admin/ContactForm'
import { getContactNumbers, getSiteSettings } from '@/lib/products-store'

/**
 * PAGINA CONTACTO DEL PANEL.
 *
 * Server Component: lee la lista de contactos de WhatsApp y la plantilla del
 * mensaje desde `site_settings` y se los pasa al formulario client
 * (`ContactForm`) que los edita y guarda via Server Action.
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>
}) {
  const [settings, contacts, { guardado }] = await Promise.all([
    getSiteSettings(),
    getContactNumbers(),
    searchParams,
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Contacto</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          Configura las personas que atienden por WhatsApp (la primera es la
          principal) y el mensaje predeterminado que reciben las consultas de
          la tienda. Los cambios se reflejan al instante.
        </p>
      </div>

      {guardado ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Cambios guardados. Ya se reflejan en la tienda.
        </p>
      ) : null}

      <ContactForm
        contacts={contacts}
        whatsappMessage={settings.whatsapp_message ?? ''}
      />
    </div>
  )
}
