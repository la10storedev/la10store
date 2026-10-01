import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { getWhatsAppNumber } from '@/lib/products-store'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { siteConfig } from '@/lib/site'

/**
 * Pie de sitio sobre fondo negro.
 * Cierra la pagina con el contraste fuerte del estilo minimalista.
 */
export async function Footer() {
  const year = new Date().getFullYear()
  const whatsappNumber = await getWhatsAppNumber()

  return (
    <footer className="mt-24 bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-10">
        <div className="flex flex-col gap-4">
          <Logo tone="light" />
          <p className="max-w-xs text-sm leading-relaxed text-zinc-400">{siteConfig.description}</p>
        </div>

        <nav className="flex flex-col gap-3 text-sm" aria-label="Navegacion del pie">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Navegacion</p>
          <Link href="/" className="text-zinc-300 transition-colors hover:text-white">
            Catalogo
          </Link>
          <Link href="/#equipos" className="text-zinc-300 transition-colors hover:text-white">
            Equipos
          </Link>
          <Link href="/#envio-pagos" className="text-zinc-300 transition-colors hover:text-white">
            Envio y Pagos
          </Link>
        </nav>

        <div className="flex flex-col gap-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Contacto</p>
          <a
            href={buildWhatsAppLink({ productName: 'una camiseta del catalogo' }, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            WhatsApp
          </a>
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="text-zinc-300 transition-colors hover:text-white"
          >
            {siteConfig.contactEmail}
          </a>
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            Instagram
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-6 sm:px-6 lg:px-10">
        <p className="mx-auto max-w-[1400px] text-xs text-zinc-500">
          © {year}{' '}
          <span className="font-semibold text-brand-500">{siteConfig.name}</span>. Catalogo
          informativo: no procesamos pagos online, la compra se coordina por WhatsApp.
        </p>
      </div>
    </footer>
  )
}
