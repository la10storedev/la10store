import { ProductCard } from '@/components/products/ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Product } from '@/types/product'

type ProductGridProps = {
  products: Product[]
  /** Mensaje cuando el filtro no arroja resultados. */
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Grilla responsive del catalogo (mobile-first), estilo ecommerce deportivo:
 * tarjetas a sangre, sin bordes y con espaciado amplio.
 */
export function ProductGrid({
  products,
  emptyTitle = 'No encontramos camisetas con esos filtros',
  emptyDescription = 'Proba limpiando alguno de los filtros o escribiendo otro equipo.',
}: ProductGridProps) {
  if (products.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {products.map((product) => (
        // `min-w-0` en el <li>: por defecto los grid items tienen
        // `min-width: auto` (= max-content), lo que puede hacer crecer la
        // columna si el contenido de la tarjeta se ensancha. Forzando `0`
        // garantizamos que la celda del grid respete el ancho asignado y
        // nunca desborde el contenedor en mobile (~375px).
        <li key={product.id} className="flex min-w-0">
          <div className="flex min-w-0 w-full">
            <ProductCard product={product} />
          </div>
        </li>
      ))}
    </ul>
  )
}
