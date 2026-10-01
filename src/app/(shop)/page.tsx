import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CreditCard, MessageCircle, Truck } from 'lucide-react'
import { Hero } from '@/components/shop/Hero'
import { ProductFilters } from '@/components/products/ProductFilters'
import { ProductGrid } from '@/components/products/ProductGrid'
import { filterProducts, getFacets, mergeAssociations, parseFilters, sortProducts } from '@/lib/products'
import { getAllProducts, getSiteSettings, getTeamLeagueAssociations } from '@/lib/products-store'
import { siteConfig } from '@/lib/site'

/**
 * CATALOGO PUBLICO.
 *
 * El filtrado y el ordenamiento ocurren en el servidor a partir de la query
 * string, no en el cliente: asi la URL es compartible y el resultado es
 * indexable. `ProductFilters` solo escribe en la URL.
 *
 * `force-dynamic` es necesario porque la DAL lee `products.json` del disco y
 * queremos que el panel de admin se refleje sin rebuild. Cuando migres a una
 * base de datos con cache, podes quitarlo y usar `revalidateTag`.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Catalogo',
  description: `Listado completo de camisetas de futbol. ${siteConfig.description}`,
}

type CatalogPageProps = {
  // En Next 16 `searchParams` llega como Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const [products, query, heroSettings, associationsByCategory] = await Promise.all([
    getAllProducts(),
    searchParams,
    getSiteSettings(),
    getTeamLeagueAssociations(),
  ])

  const filters = parseFilters(query)
  // El filtro es global: une las asociaciones de seleccion y club en un solo
  // mapa (los nombres de liga son unicos por categoria; el merge concatena sin
  // duplicar y ordena). `getTeamLeagueAssociations` degrada a vacio si la tabla
  // `team_leagues` no existe todavia, asi el catalogo no se rompe.
  const associations = mergeAssociations(
    associationsByCategory.seleccion,
    associationsByCategory.club,
  )
  const facets = getFacets(products, associations)
  const visible = sortProducts(filterProducts(products, filters), filters.sort)

  return (
    <>
      {/* Hero con filtros integrados */}
      <Hero
        image={heroSettings.hero_image || undefined}
        title={heroSettings.hero_title}
        subtitle={heroSettings.hero_subtitle}
        tagline={heroSettings.hero_tagline}
        ctaText={heroSettings.hero_cta_text}
        ctaLink={heroSettings.hero_cta_link}
      >
        <Suspense fallback={<FiltersSkeleton />}>
          <ProductFilters facets={facets} filters={filters} />
        </Suspense>
      </Hero>

      {/* ---------------------------------------------------------------- */}
      {/* Grilla de productos                                              */}
      {/* ---------------------------------------------------------------- */}
      <section id="catalogo" className="scroll-mt-20">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-10">
          <div className="mb-6 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950">
              {visible.length === products.length
                ? `${products.length} camisetas`
                : `${visible.length} de ${products.length} camisetas`}
            </h2>
          </div>

          <ProductGrid products={visible} />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Equipos: accesos rapidos en fila scrolleable                    */}
      {/* ---------------------------------------------------------------- */}
      <section id="equipos" className="scroll-mt-20 border-t border-zinc-200">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-950">Equipos</h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-500">
            Entradas rapidas por equipo. Tambien podes filtrar desde la barra de arriba.
          </p>

          <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-2">
              {facets.teams.map((team) => (
                <li key={team} className="shrink-0">
                  <Link
                    href={`/?team=${encodeURIComponent(team)}`}
                    className="inline-flex border border-zinc-300 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-950 transition-colors hover:border-brand-600 hover:bg-brand-600 hover:text-white"
                  >
                    {team}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {facets.leagues.map((league) => (
              <li key={league}>
                <Link
                  href={`/?league=${encodeURIComponent(league)}`}
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                >
                  {league}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Envio y pagos                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section id="envio-pagos" className="scroll-mt-20 border-t border-zinc-200">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-950">
            Envio y Pagos
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: 'Envio a todo el pais',
                body: 'Enviamos a todo el país por encomienda o transporte. Consultanos por WhatsApp para coordinar el envío y conocer el costo según tu zona.',
                icon: Truck,
              },
              {
                title: 'Medios de pago',
                body: 'Aceptamos transferencia bancaria, efectivo y otros medios de pago. Consultanos las opciones disponibles.',
                icon: CreditCard,
              },
              {
                title: 'Como comprar',
                body: 'Elegí tu camiseta, consultanos disponibilidad por WhatsApp y coordinamos el pago y envío. Sin carrito, sin pagos online: hablamos directo.',
                icon: MessageCircle,
              },
            ].map((item) => (
              <div key={item.title} className="border-t-2 border-brand-600 pt-4">
                <item.icon className="size-5 text-brand-600" aria-hidden />
                <h3 className="mt-2 text-base font-bold text-zinc-950">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

/** Placeholder mientras se resuelve el componente que usa `useSearchParams`. */
function FiltersSkeleton() {
  return (
    <div className="border-y border-zinc-200">
      <div className="mx-auto h-14 max-w-[1400px] animate-pulse px-4 sm:px-6 lg:px-10" aria-hidden />
    </div>
  )
}
