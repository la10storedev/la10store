'use client'

import { useMemo, useState } from 'react'
import { SizeSelector } from '@/components/products/SizeSelector'
import { ButtonLink } from '@/components/ui/Button'
import { buildWhatsAppLink, buildWhatsAppMessage } from '@/lib/whatsapp'
import { availableSizes, productStockStatus, totalStock } from '@/lib/products'
import type { Product } from '@/types/product'

type ProductContactPanelProps = {
  product: Product
  /** Numero de WhatsApp resuelto en el servidor desde `site_settings`. */
  whatsappNumber: string
}

/**
 * Panel de compra: elige el talle y abre WhatsApp con el mensaje ya escrito.
 *
 * Es el "checkout" de la app. No hay pagos: el unico flujo es consultar.
 * Se preselecciona el primer talle con stock para que el boton nunca quede
 * inutilizable, y el link se recalcula en cada cambio.
 */
export function ProductContactPanel({ product, whatsappNumber }: ProductContactPanelProps) {
  const inStock = availableSizes(product)
  // Primer talle con stock como valor inicial (o el primero de la lista).
  const [size, setSize] = useState<string | undefined>(inStock[0]?.size ?? product.sizes[0]?.size)

  const link = useMemo(
    () =>
      buildWhatsAppLink(
        {
          productName: product.name,
          size,
          price: product.price,
          productId: product.id,
        },
        whatsappNumber,
      ),
    [product.id, product.name, product.price, size, whatsappNumber],
  )

  const preview = buildWhatsAppMessage({
    productName: product.name,
    size,
    price: product.price,
    productId: product.id,
  })

  const status = productStockStatus(product)
  const soldOut = status === 'encargo'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-950">
            Elegi tu talle
          </h2>
          <p className="text-xs text-zinc-500">
            {totalStock(product)} {totalStock(product) === 1 ? 'unidad' : 'unidades'}
          </p>
        </div>

        <SizeSelector sizes={product.sizes} value={size} onChange={setSize} />

        <p className="text-xs text-zinc-500">
          {soldOut
            ? 'Sin stock por el momento: se hace por encargo. Escribinos y lo coordinamos.'
            : `Talle ${size}: ${product.sizes.find((item) => item.size === size)?.stock ?? 0} disponibles.`}
        </p>
      </div>

      <ButtonLink
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        variant="whatsapp"
        size="lg"
        className="w-full"
      >
        Consultar por esta camiseta
      </ButtonLink>

      {/* Vista previa del mensaje: le da transparencia al usuario. */}
      <details className="border-t border-zinc-200 pt-3">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 transition-colors hover:text-zinc-950">
          Ver mensaje que se va a enviar
        </summary>
        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-zinc-500">{preview}</p>
      </details>
    </div>
  )
}
