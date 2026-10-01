import Link from 'next/link'
import { ProductForm } from '@/components/admin/ProductForm'
import { getTaxonomy } from '@/lib/products-store'

/** ALTA de camiseta. */
export default async function NewProductPage() {
  const taxonomy = await getTaxonomy()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav aria-label="Migas de pan" className="text-sm text-zinc-500">
          <Link href="/admin/inventario" className="hover:text-zinc-900">
            Inventario
          </Link>
          <span aria-hidden className="mx-1.5">
            /
          </span>
          <span className="font-medium text-zinc-900">Nueva camiseta</span>
        </nav>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">Nueva camiseta</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          Complete los datos, cargue las imagenes y defina el stock por talle. Al guardar, la
          camiseta aparece en el catalogo publico.
        </p>
      </div>

      <ProductForm taxonomy={taxonomy} />
    </div>
  )
}
