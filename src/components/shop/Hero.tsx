import { getWhatsAppNumber } from '@/lib/products-store'
import { buildWhatsAppLink } from '@/lib/whatsapp'

/**
 * Hero de la portada: imagen de fondo con overlay y titular en mayusculas.
 *
 * Los textos vienen de `site_settings` (los edita el admin en /admin/apariencia).
 * Si no hay imagen cargada, cae al asset por defecto en `public/img/hero.jpg`.
 */
type HeroProps = {
  image?: string
  title: string
  subtitle: string
  tagline: string
  ctaText: string
  ctaLink: string
  children?: React.ReactNode
}

export async function Hero({ image, title, subtitle, tagline, ctaText, ctaLink, children }: HeroProps) {
  const background = image && image.trim() !== '' ? image : '/img/hero.jpg'
  const whatsappNumber = await getWhatsAppNumber()

  return (
    <section className="relative isolate flex flex-col bg-zinc-950 text-white">
      {/* Imagen decorativa de fondo */}
      {/* eslint-disable-next-line @next/next/no-img-element -- asset decorativo, sin optimizacion */}
      <img
        src={background}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-10 size-full object-cover object-[80%_center]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950/70 via-zinc-950/50 to-zinc-950/90"
      />

      {/* Contenido superior: textos + CTAs */}
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-20 sm:px-6 sm:pt-28 lg:px-10 lg:pt-36">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
          {tagline}
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-4xl md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
          {subtitle}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
          <a
            href={ctaLink || '#catalogo'}
            className="inline-flex items-center justify-center gap-2 rounded-none border border-white bg-transparent px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-white hover:text-zinc-900"
          >
            {ctaText || 'Ver catalogo'}
          </a>
          <a
            href={buildWhatsAppLink({ productName: 'una camiseta del catalogo' }, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-none border border-white bg-transparent px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-white hover:text-zinc-900"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Consultar por WhatsApp
          </a>
        </div>
      </div>

      {/* Filtros integrados: fondo oscuro semitransparente, anclados al fondo del hero */}
      {children && (
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-24 pb-8 sm:px-6 lg:px-10 lg:pb-12">
          <div className="rounded-lg bg-zinc-950/40 p-4 backdrop-blur-sm sm:p-6">
            {children}
          </div>
        </div>
      )}
    </section>
  )
}