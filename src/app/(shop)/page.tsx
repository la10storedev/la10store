import { Suspense } from 'react'
import type { Metadata } from 'next'
import {
  Banknote,
  Bike,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
  Package,
  Percent,
  Repeat,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from 'lucide-react'
import { Hero } from '@/components/shop/Hero'
import { ProductFilters } from '@/components/products/ProductFilters'
import { ProductGrid } from '@/components/products/ProductGrid'
import { filterProducts, getFacets, mergeAssociations, parseFilters, sortProducts } from '@/lib/products'
import {
  getAllProducts,
  getShippingSettings,
  getSiteSettings,
  getTeamLeagueAssociations,
  type ShippingIcon,
} from '@/lib/products-store'
import { siteConfig } from '@/lib/site'
import type { LucideIcon } from 'lucide-react'

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
  description: `Listado completo de productos. ${siteConfig.description}`,
}

type CatalogPageProps = {
  // En Next 16 `searchParams` llega como Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Resuelve el icono de lucide-react a partir del slug que guarda el admin. */
function resolveShippingIcon(icon: ShippingIcon): LucideIcon {
  switch (icon) {
    case 'truck':
      return Truck
    case 'package':
      return Package
    case 'cash':
      return Banknote
    case 'wallet':
      return Wallet
    case 'card':
      return CreditCard
    case 'moto':
      return Bike
    case 'store':
      return Store
    case 'map-pin':
      return MapPin
    case 'clock':
      return Clock
    case 'repeat':
      return Repeat
    case 'shield':
      return ShieldCheck
    case 'percent':
      return Percent
    case 'chat':
      return MessageCircle
  }
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const [products, query, heroSettings, associationsByCategory, shippingSettings] = await Promise.all([
    getAllProducts(),
    searchParams,
    getSiteSettings(),
    getTeamLeagueAssociations(),
    getShippingSettings(),
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
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950 dark:text-zinc-100">
              {visible.length === products.length
                ? `${products.length} productos`
                : `${visible.length} de ${products.length} productos`}
            </h2>
          </div>

          <ProductGrid products={visible} />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Envio y pagos                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section id="envio-pagos" className="scroll-mt-20 border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-950 dark:text-zinc-100">
            {shippingSettings.title}
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {shippingSettings.items.map((item, index) => {
              const Icon = resolveShippingIcon(item.icon)
              return (
                <div
                  key={`${item.title}-${index}`}
                  className="border-t-2 border-brand-600 pt-4 dark:border-brand-400"
                >
                  <Icon className="size-5 text-brand-600 dark:text-brand-400" aria-hidden />
                  <h3 className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{item.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

/** Placeholder mientras se resuelve el componente que usa `useSearchParams`. */
function FiltersSkeleton() {
  return (
    <div className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="mx-auto h-14 max-w-6xl animate-pulse px-4 sm:px-6"
        aria-hidden
      />
    </div>
  )
}
