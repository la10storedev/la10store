import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { siteConfig } from '@/lib/site'
import './globals.css'

/**
 * Layout raiz. Solo aporta <html>/<body>, fuentes y metadata.
 *
 * El header/footer publico viven en `src/app/(shop)/layout.tsx` para que
 * `/admin` tenga un layout independiente, sin Navbar ni Footer de tienda.
 *
 * El sitio publico se sirve siempre en oscuro (la clase `dark` se aplica
 * desde `(shop)/layout.tsx`); el panel admin nunca la recibe y queda en
 * claro. No hay toggle de tema: la decision es del proyecto, no del usuario.
 */
export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} · ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: '/favicon.ico',
  },
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  )
}
