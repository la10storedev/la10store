import Link from 'next/link'
import { ProductImage } from '@/components/products/ProductImage'
import { formatPrice } from '@/lib/format'
import { availableSizes, productStockStatus, totalStock } from '@/lib/products'
import type { Product } from '@/types/product'

/** Iniciales del equipo para el placeholder (ej. "FC Barcelona" -> "FCB"). */
function teamInitials(team: string): string {
  return team
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

type ProductCardProps = {
  product: Product
}

/**
 * Tarjeta del catalogo: imagen protagonista, sin bordes ni esquinas redondeadas.
 * Debajo, el texto minimo (equipo, nombre, precio y un aviso de stock).
 *
 * Es un Server Component; la unica parte interactiva es el link estirado.
 */
export function ProductCard({ product }: ProductCardProps) {
  const sizes = availableSizes(product)
  const status = productStockStatus(product)

  // `sizes` ya viene filtrado a talles con stock > 0. Si esta vacio, el
  // producto esta sin stock (encargo) o no tiene talles definidos. Mostramos
  // SIEMPRE la linea "Talles:" para que todas las tarjetas de la grilla
  // tengan la misma altura: si hay stock listamos los talles; si no, dejamos
  // un fallback honesto ("Consultar") que ademas guia al cliente a escribirnos
  // por WhatsApp para coordinar el pedido, igual que el banner "Encargo".
  const tallesLabel =
    sizes.length > 0
      ? `Talles: ${sizes.map((s) => s.size).join(' ')}`
      : 'Talles: Consultar'

  return (
    // `min-w-0` en el <article>: corta la cadena de `min-width: auto` de los
    // flex items para que la tarjeta nunca exceda el ancho de la columna del
    // grid, dejando trabajar a `truncate` y `line-clamp-2` correctamente.
    <article className="group relative flex min-w-0 flex-col transition-shadow duration-300 group-hover:shadow-lg">
      {/* Imagen: sin recuadro, el producto flota sobre el fondo blanco. */}
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        <Link href={`/products/${product.id}`} className="block size-full" tabIndex={-1} aria-hidden>
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            colors={product.colors}
            initials={teamInitials(product.team)}
            className={[
              'size-full object-cover transition duration-500 group-hover:scale-105',
              status === 'encargo' ? 'opacity-50' : '',
            ].join(' ')}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        </Link>

        {product.featured ? (
          <span className="absolute left-3 top-3 bg-brand-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
            Destacada
          </span>
        ) : null}

        {status === 'encargo' ? (
          <span className="absolute inset-x-0 bottom-0 bg-brand-100 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-800">
            Encargo
          </span>
        ) : null}
      </div>

      {/* Ficha minima */}
      {/* `min-w-0` en el contenedor flex-col: permite que sus hijos
          (`truncate`, `line-clamp-2`, texto largo) se contraigan por debajo
          del ancho intrinseco de su contenido y no empujen la tarjeta. */}
      <div className="flex min-w-0 flex-1 flex-col pt-3">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">
          {product.team} · {product.league}
        </p>
        <h3 className="mt-1 text-sm font-medium leading-snug text-zinc-950">
          {/* Link adicional para que el titulo completo sea accesible */}
          <Link
            href={`/products/${product.id}`}
            className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:underline-offset-4"
          >
            {product.name}
          </Link>
        </h3>
        {/* Fila precio + "Ultimas N u.": `min-w-0` para que la fila no se
            estire; el <span> de stock se trunca si no entra junto al precio. */}
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-sm font-semibold text-zinc-950">{formatPrice(product.price)}</p>
          {status === 'ultimas' ? (
            <span className="min-w-0 truncate text-[11px] font-medium text-amber-700">
              Ultimas {totalStock(product)} u.
            </span>
          ) : null}
        </div>
        {/* Linea siempre presente: garantiza la misma altura entre tarjetas
            con y sin talles con stock. Mismo `mt-0.5` + `text-[11px]` que
            antes, asi el alto de la linea es identico al caso anterior. */}
        <p className="mt-0.5 truncate text-[11px] text-zinc-400">{tallesLabel}</p>
      </div>
    </article>
  )
}
