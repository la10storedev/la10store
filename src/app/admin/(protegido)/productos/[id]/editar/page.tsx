import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DeleteProductForm } from '@/components/admin/DeleteProductForm'
import { ProductForm } from '@/components/admin/ProductForm'
import { ButtonLink } from '@/components/ui/Button'
import { getProductById, getTaxonomy } from '@/lib/products-store'

type EditProductPageProps = {
  // En Next 16 los params llegan como Promise.
  params: Promise<{ id: string }>
  searchParams: Promise<{ guardado?: string }>
}

/** EDICION de camiseta. Comparte el mismo formulario que el alta. */
export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const [{ id }, { guardado }] = await Promise.all([params, searchParams])
  // Incluye productos ocultos: el admin edita tambien lo que no se ve en la tienda.
  const product = await getProductById(id, { includeHidden: true })

  if (!product) notFound()

  const taxonomy = await getTaxonomy()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <nav aria-label="Migas de pan" className="text-sm text-zinc-500">
            <Link href="/admin/inventario" className="hover:text-zinc-900">
              Inventario
            </Link>
            <span aria-hidden className="mx-1.5">
              /
            </span>
            <span className="font-medium text-zinc-900">Editar</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{product.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Ref. <span className="font-mono text-xs">{product.id}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink
            href={`/products/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
          >
            Ver en la tienda
          </ButtonLink>
          <DeleteProductForm id={product.id} name={product.name} />
        </div>
      </div>

      <ProductForm
        product={product}
        taxonomy={taxonomy}
        justSaved={guardado === '1'}
      />
    </div>
  )
}
