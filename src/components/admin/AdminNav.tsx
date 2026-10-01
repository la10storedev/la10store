'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Plus, Palette, Trash2, MessageCircle, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const links: { href: string; label: string; icon: LucideIcon; exact: boolean }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/inventario', label: 'Inventario', icon: Package, exact: false },
  { href: '/admin/productos/nuevo', label: 'Nueva camiseta', icon: Plus, exact: false },
  { href: '/admin/equipos', label: 'Equipos y ligas', icon: Users, exact: false },
  { href: '/admin/apariencia', label: 'Apariencia', icon: Palette, exact: false },
  { href: '/admin/contacto', label: 'Contacto', icon: MessageCircle, exact: false },
]

/** Navegacion del panel. Client Component por `usePathname`. */
export function AdminNav({ deletedCount = 0 }: { deletedCount?: number }) {
  const pathname = usePathname()

  // El link a "Eliminados" aparece solo cuando hay algo en la papelera
  // (camisetas + equipos + ligas). El conteo lo calcula el layout con
  // `getTrashCounts()`.
  const visibleLinks = deletedCount > 0
    ? [...links, { href: '/admin/eliminados', label: 'Eliminados', icon: Trash2, exact: false }]
    : links

  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Navegacion del panel">
      {visibleLinks.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
        const Icon = link.icon
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition',
              active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900',
            ].join(' ')}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
