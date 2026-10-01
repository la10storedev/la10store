import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductGallery, type GalleryImage } from '@/components/products/ProductGallery'
import { ProductContactPanel } from '@/components/products/ProductContactPanel'
import { ProductGrid } from '@/components/products/ProductGrid'
import { StockBadge } from '@/components/ui/StockBadge'
import { formatDate, formatPrice } from '@/lib/format'
import { availableSizes, categoryLabels, totalStock } from '@/lib/products'
import { getAllProducts, getProductById, getWhatsAppNumber } from '@/lib/products-store'
import { siteConfig } from '@/lib/site'

/** Misma razon que en el catalogo: la DAL lee del disco. */
export const dynamic = 'force-dynamic'

type ProductPageProps = {
  // En Next 16 los params de segmentos dinamicos llegan como Promise.
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) return { title: 'Camiseta no encontrada' }

  return {
    title: product.name,
    description: `${product.description.slice(0, 155)}…`,
    openGraph: { title: `${product.name} · ${siteConfig.name}`, images: product.images },
  }
}

/** Sugerimos camisetas de otros equipos al final de la pagina. */
async function getRelated(productId: string, category: string) {
  const products = await getAllProducts()
  const sameCategory = products.filter((p) => p.id !== productId && p.category === category)
  const rest = products.filter((p) => p.id !== productId && p.category !== category)
  return [...sameCategory, ...rest].slice(0, 4)
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) notFound()

  const related = await getRelated(product.id, product.category)
  const sizes = availableSizes(product)
  const whatsappNumber = await getWhatsAppNumber()

  const images: GalleryImage[] = product.images.length
    ? product.images.map((src, index) => ({ src, alt: `${product.name} · foto ${index + 1}` }))
    : [{ alt: product.name }]

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {/* Migas de pan */}
      <nav aria-label="Migas de pan" className="mb-6 text-[11px] uppercase tracking-[0.1em] text-zinc-400">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="transition-colors hover:text-zinc-950">
              Catalogo
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={`/?team=${encodeURIComponent(product.team)}`}
              className="transition-colors hover:text-zinc-950"
            >
              {product.team}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="max-w-[70vw] truncate text-zinc-950" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        {/* ---------------------------- Galeria --------------------------- */}
        <ProductGallery
          images={images}
          colors={product.colors}
          initials={product.team
            .split(/\s+/)
            .map((word) => word[0])
            .join('')
            .slice(0, 3)
            .toUpperCase()}
        />

        {/* ---------------------------- Informacion ----------------------- */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <header className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {categoryLabels[product.category]} · {product.league} · {product.season}
            </p>

            <h1 className="text-2xl font-black uppercase leading-[1.05] tracking-tight text-zinc-950 sm:text-3xl">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-bold text-zinc-950">{formatPrice(product.price)}</p>
              <StockBadge product={product} />
            </div>
            <p className="text-xs text-zinc-500">Precio de referencia. Confirmamos por WhatsApp.</p>
          </header>

          <hr className="border-zinc-200" />

          {/* Selector de talle + CTA de WhatsApp */}
          <ProductContactPanel product={product} whatsappNumber={whatsappNumber} />

          <hr className="border-zinc-200" />

          {/* Descripcion: colapsable, se abre con "Ficha tecnica" */}
          <details className="border-t border-zinc-200 pt-4">
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-950">
              Ficha técnica
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{product.description}</p>
          </details>

          {/* Ficha tecnica */}
          <section className="flex flex-col gap-3 border-t border-zinc-200 pt-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-950">
              Disponibilidad
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-zinc-400">Talles</dt>
                <dd className="mt-0.5 font-medium text-zinc-950">
                  {sizes.length > 0 ? sizes.map((size) => size.size).join(' · ') : 'Sin stock'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-zinc-400">Unidades</dt>
                <dd className="mt-0.5 font-medium text-zinc-950">{totalStock(product)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-zinc-400">Alta</dt>
                <dd className="mt-0.5 font-medium text-zinc-950">{formatDate(product.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-zinc-400">Referencia</dt>
                <dd className="mt-0.5 font-mono text-xs text-zinc-600">{product.id}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* Relacionadas */}
      {related.length > 0 ? (
        <section className="mt-20 border-t border-zinc-200 pt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-zinc-950">
              Tambien te puede interesar
            </h2>
            <Link
              href="/"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
            >
              Ver todo
            </Link>
          </div>
          <div className="mt-8">
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
