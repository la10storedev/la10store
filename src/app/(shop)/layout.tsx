import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

/**
 * Layout del sitio publico.
 *
 * El nombre del grupo `(shop)` no aparece en la URL: agrupa las paginas con
 * Navbar + Footer. Gracias a eso `/admin` puede tener su propio layout.
 *
 * El sitio publico se sirve siempre en oscuro: la clase `dark` se aplica en
 * el wrapper para activar las variantes `dark:` de Tailwind. El panel admin
 * no recibe esa clase y permanece en claro.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark flex min-h-full flex-1 flex-col bg-white dark:bg-[#09090b]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-zinc-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
