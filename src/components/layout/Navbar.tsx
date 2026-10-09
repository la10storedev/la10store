import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { ButtonLink } from '@/components/ui/Button'
import { getWhatsAppMessage, getWhatsAppNumber } from '@/lib/products-store'
import { buildWhatsAppLink } from '@/lib/whatsapp'

/**
 * Header publico. Es un Server Component: solo el menu movil necesita JS.
 *
 * Estetica tipo ecommerce deportivo: barra fina, solida, links en mayusculas
 * con tracking amplio y el CTA de contacto en el naranja de la marca.
 *
 * El sitio publico va siempre en oscuro (la clase `dark` la pone el layout
 * de la shop). Por eso el logo se renderiza una sola vez en su variante
 * "light" (tinta blanca) y las superficies usan variantes `dark:`.
 */
export async function Navbar() {
  const [whatsappNumber, whatsappMessage] = await Promise.all([
    getWhatsAppNumber(),
    getWhatsAppMessage(),
  ])

  const navLinks = [
    { label: 'Catálogo', href: '/#catalogo' },
    { label: 'Envío y pagos', href: '/#envio-pagos' },
  ]

  const whatsappLink = buildWhatsAppLink(
    { productName: 'un articulo del catalogo' },
    whatsappNumber,
    whatsappMessage,
  )

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white transition-colors dark:border-zinc-800 dark:bg-[#09090b]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo tone="light" className="h-10 w-auto md:h-12" />

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium uppercase tracking-wide text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Consultar
          </ButtonLink>
          <MobileMenu
            whatsappNumber={whatsappNumber}
            whatsappMessage={whatsappMessage}
            navLinks={navLinks}
          />
        </div>
      </div>
    </header>
  )
}
