import { AppearanceForm } from '@/components/admin/AppearanceForm'
import { getSiteSettings } from '@/lib/products-store'

/**
 * PAGINA APARIENCIA DEL PANEL.
 *
 * Server Component: lee los settings del hero y se los pasa al formulario
 * client (`AppearanceForm`) que edita y guarda via Server Action.
 */
export default async function AppearancePage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>
}) {
  const [settings, { guardado }] = await Promise.all([getSiteSettings(), searchParams])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Apariencia</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          Personaliza el hero de la portada: imagen de fondo, titulos y boton de accion. Los
          cambios se reflejan en la tienda al instante.
        </p>
      </div>

      {guardado ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Cambios guardados. Ya se reflejan en la portada.
        </p>
      ) : null}

      <AppearanceForm
        initial={{
          heroImage: settings.hero_image ?? '',
          heroTitle: settings.hero_title ?? '',
          heroSubtitle: settings.hero_subtitle ?? '',
          heroTagline: settings.hero_tagline ?? '',
          heroCtaText: settings.hero_cta_text ?? '',
          heroCtaLink: settings.hero_cta_link ?? '',
        }}
      />
    </div>
  )
}