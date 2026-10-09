import { AppearanceForm } from '@/components/admin/AppearanceForm'
import { FooterForm } from '@/components/admin/FooterForm'
import { ShippingForm } from '@/components/admin/ShippingForm'
import { getFooterSettings, getShippingSettings, getSiteSettings } from '@/lib/products-store'

/**
 * PAGINA APARIENCIA DEL PANEL.
 *
 * Reune los formularios que el admin usa para tocar la "piel" publica del
 * sitio: hero (imagen y textos), seccion "Envio y pagos" (titulo + items
 * editables) y footer (descripcion + contacto + copyright).
 *
 * Server Component: lee los settings de la base y se los pasa a los
 * formularios client. Cada formulario tiene su propio server action.
 *
 * El query param `guardado` se usa para mostrar un banner de confirmacion
 * despues de un redirect desde un server action. Los valores posibles son:
 *  - `1`         : guardado del hero (back-compat con la URL anterior).
 *  - `footer`    : guardado del footer.
 *  - `envios`    : guardado de envios y pagos.
 *  - cualquier otro valor: "Cambios guardados." generico.
 */
export default async function AppearancePage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>
}) {
  const [heroSettings, footerSettings, shippingSettings, { guardado }] = await Promise.all([
    getSiteSettings(),
    getFooterSettings(),
    getShippingSettings(),
    searchParams,
  ])

  const banner = guardado
    ? guardado === 'footer'
      ? 'Cambios guardados en el footer.'
      : guardado === 'envios'
        ? 'Cambios guardados en envíos y pagos.'
        : 'Cambios guardados.'
    : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Apariencia</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          Personaliza el hero, la seccion de envios y pagos y el footer de la portada. Los
          cambios se reflejan en la tienda al instante.
        </p>
      </div>

      {banner ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {banner}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900">Hero de la portada</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Imagen de fondo y textos que se muestran arriba de todo en la home.
          </p>
        </header>
        <AppearanceForm
          initial={{
            heroImage: heroSettings.hero_image ?? '',
            heroTitle: heroSettings.hero_title ?? '',
            heroSubtitle: heroSettings.hero_subtitle ?? '',
            heroTagline: heroSettings.hero_tagline ?? '',
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900">Envíos y pagos</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Titulo y bloques que aparecen en la seccion &ldquo;Envio y pagos&rdquo; de la portada.
          </p>
        </header>
        <ShippingForm
          initial={{
            title: shippingSettings.title,
            items: shippingSettings.items,
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900">Footer</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Descripcion, datos de contacto y linea de copyright del pie de pagina.
          </p>
        </header>
        <FooterForm
          initial={{
            description: footerSettings.description,
            email: footerSettings.email,
            instagramUrl: footerSettings.instagramUrl,
            copyright: footerSettings.copyright,
          }}
        />
      </section>
    </div>
  )
}
