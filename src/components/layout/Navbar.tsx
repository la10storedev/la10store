import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { MobileNav } from '@/components/layout/MobileNav'
import { ButtonLink } from '@/components/ui/Button'
import { getWhatsAppNumber } from '@/lib/products-store'
import { buildWhatsAppLink } from '@/lib/whatsapp'

const navLinks = [
  { href: '/', label: 'Catalogo' },
  { href: '/#equipos', label: 'Equipos' },
  { href: '/#envio-pagos', label: 'Envio y Pagos' },
]

/**
 * Header publico. Es un Server Component: solo el menu movil necesita JS.
 *
 * Estetica tipo ecommerce deportivo: barra fina, blanca y solida, links en
 * mayusculas con tracking amplio y el CTA de contacto en negro.
 */
export async function Navbar() {
  const whatsappNumber = await getWhatsAppNumber()

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <Logo preload />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegacion principal">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 transition-colors hover:text-zinc-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink
            href={buildWhatsAppLink({ productName: 'una camiseta del catalogo' }, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Consultar
          </ButtonLink>
          <MobileNav whatsappNumber={whatsappNumber} />
        </div>
      </div>
    </header>
  )
}
