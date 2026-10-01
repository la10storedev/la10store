'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { buildWhatsAppLink } from '@/lib/whatsapp'

/**
 * Menu movil a pantalla completa, al estilo de las apps de ecommerce deportivo.
 *
 * Es un Client Component porque necesita estado para abrir/cerrar. El menu se
 * cierra en el `onClick` de cada link (no con un `useEffect` que vigile la
 * ruta: eso provocaria renders en cascada).
 */
const links = [
  { href: '/', label: 'Catalogo' },
  { href: '/#equipos', label: 'Equipos' },
  { href: '/#envio-pagos', label: 'Envio y Pagos' },
]

type MobileNavProps = {
  /** Numero de WhatsApp resuelto en el servidor desde `site_settings`. */
  whatsappNumber: string
}

export function MobileNav({ whatsappNumber }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  // Mientras el menu esta abierto: bloquea el scroll del fondo, cierra con Esc
  // y se cierra solo si el viewport pasa a desktop (md: 768px).
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

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="menu-movil"
        aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
        className="grid size-9 place-items-center text-zinc-950"
      >
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open ? (
        <div
          id="menu-movil"
          className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-y-auto overscroll-contain border-t border-zinc-200 bg-white px-6 py-8"
        >
          <nav className="flex flex-col" aria-label="Navegacion movil">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-zinc-100 py-4 text-2xl font-black uppercase tracking-tight text-zinc-950 transition-colors hover:text-zinc-500"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <ButtonLink
            href={buildWhatsAppLink({ productName: 'una camiseta del catalogo' }, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="lg"
            onClick={() => setOpen(false)}
            className="mt-8 w-full"
          >
            Consultar por WhatsApp
          </ButtonLink>
        </div>
      ) : null}
    </div>
  )
}
