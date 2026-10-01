import { ButtonLink } from '@/components/ui/Button'
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
}

export async function Hero({ image, title, subtitle, tagline, ctaText, ctaLink }: HeroProps) {
  const background = image && image.trim() !== '' ? image : '/img/hero.jpg'
  const whatsappNumber = await getWhatsAppNumber()

  return (
    <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
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
        className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/20"
      />

      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-28 lg:px-10 lg:py-36">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
          {tagline}
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-4xl md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-300 sm:text-base">
          {subtitle}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ButtonLink
            href={ctaLink}
            variant="secondary"
            size="lg"
            className="border-brand-600! text-brand-700! hover:border-brand-600! hover:bg-brand-600!"
          >
            {ctaText}
          </ButtonLink>
          <a
            href={buildWhatsAppLink({ productName: 'una camiseta del catalogo' }, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-white underline underline-offset-8 transition-colors hover:text-zinc-300"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}