'use client'

import Link from 'next/link'
import { Menu, MessageCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { buildWhatsAppLink } from '@/lib/whatsapp'

/**
 * Menu movil a pantalla completa, al estilo de las apps de ecommerce deportivo.
 *
 * - El trigger (boton hamburguesa) vive en el Navbar; este componente se
 *   ocupa del panel a pantalla completa.
 * - Se cierra con la `X` del header, con Escape, al hacer click en un link
 *   y automaticamente si el viewport pasa a desktop (>= md).
 * - Mientras esta abierto bloquea el scroll del fondo.
 */
type MobileMenuProps = {
  /** Numero de WhatsApp resuelto en el servidor desde `site_settings`. */
  whatsappNumber: string
  /** Plantilla del mensaje resuelta en el servidor desde `site_settings`. */
  whatsappMessage: string
  /** Links de navegacion a renderizar como botones grandes. */
  navLinks: { label: string; href: string }[]
}

export function MobileMenu({ whatsappNumber, whatsappMessage, navLinks }: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  // Mientras el menu esta abierto: bloquea el scroll del fondo, cierra con
  // Esc y se cierra solo si el viewport pasa a desktop (md: 768px).
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 768px)')
    const onViewportChange = () => {
      if (desktop.matches) setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    desktop.addEventListener('change', onViewportChange)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onViewportChange)
    }
  }, [open])

  const whatsappLink = buildWhatsAppLink(
    { productName: 'un articulo del catalogo' },
    whatsappNumber,
    whatsappMessage,
  )

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="menu-movil"
        aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
        className="rounded-md p-2 text-zinc-950 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open ? (
        <div
          id="menu-movil"
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-white px-6 py-8 transition-colors dark:bg-[#09090b]"
        >
          <div className="mb-8 flex items-center justify-end border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menu"
              className="rounded-md p-2 text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <nav className="flex flex-col gap-2" aria-label="Navegacion movil">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-3 text-2xl font-semibold uppercase tracking-tight text-zinc-950 transition-colors hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <ButtonLink
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="lg"
            onClick={() => setOpen(false)}
            className="mt-10 w-full"
          >
            <MessageCircle className="size-5" aria-hidden />
            Consultar por WhatsApp
          </ButtonLink>
        </div>
      ) : null}
    </div>
  )
}
