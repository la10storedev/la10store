'use client'

import { useMemo, useState } from 'react'
import { SizeSelector } from '@/components/products/SizeSelector'
import { ButtonLink } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Form'
import { buildWhatsAppLink, buildWhatsAppMessage } from '@/lib/whatsapp'
import { availableSizes, productStockStatus, totalStock } from '@/lib/products'
import type { Contact } from '@/lib/products-store'
import type { Product } from '@/types/product'

type ProductContactPanelProps = {
  product: Product
  /** Numero de WhatsApp resuelto en el servidor desde `site_settings`. */
  whatsappNumber: string
  /** Plantilla del mensaje resuelta en el servidor desde `site_settings`. */
  whatsappMessage: string
  /** Contactos editables configurados por el admin. */
  contacts: Contact[]
}

/**
 * Panel de compra: elige el contacto y el talle, y abre WhatsApp con el
 * mensaje ya escrito.
 *
 * Es el "checkout" de la app. No hay pagos: el unico flujo es consultar.
 * El primer contacto es el predeterminado, pero el visitante puede elegir a
 * qué persona escribirle. Se preselecciona el primer talle con stock para que
 * el boton nunca quede inutilizable, y el link se recalcula en cada cambio.
 */
export function ProductContactPanel({
  product,
  whatsappNumber,
  whatsappMessage,
  contacts,
}: ProductContactPanelProps) {
  const inStock = availableSizes(product)
  // Primer talle con stock como valor inicial (o el primero de la lista).
  const [size, setSize] = useState<string | undefined>(inStock[0]?.size ?? product.sizes[0]?.size)

  // Contacto activo. Se clampa en el render: si la lista se achica, el indice
  // se ajusta al ultimo valor valido sin necesidad de sincronizar por efecto.
  const [contactIndex, setContactIndex] = useState(0)
  const safeContactIndex = Math.min(Math.max(contactIndex, 0), Math.max(0, contacts.length - 1))
  const activeNumber = contacts[safeContactIndex]?.number ?? whatsappNumber

  const link = useMemo(
    () =>
      buildWhatsAppLink(
        {
          productName: product.name,
          size,
          price: product.price,
          productId: product.id,
        },
        activeNumber,
        whatsappMessage,
      ),
    [product.id, product.name, product.price, size, activeNumber, whatsappMessage],
  )

  const preview = buildWhatsAppMessage(
    {
      productName: product.name,
      size,
      price: product.price,
      productId: product.id,
    },
    whatsappMessage,
  )

  const status = productStockStatus(product)
  const soldOut = status === 'encargo'

  return (
    <div className="flex flex-col gap-5">
      <Field
        htmlFor="contact"
        label="Consultar a"
        hint="Elegí a qué persona escribir. El primero es el predeterminado."
      >
        <Select
          id="contact"
          value={String(safeContactIndex)}
          onChange={(e) => setContactIndex(Number(e.target.value))}
        >
          {contacts.map((c, i) => (
            <option key={i} value={i}>
              {(c.name || 'Sin nombre')}
              {i === 0 ? ' (principal)' : ''}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-950 dark:text-zinc-100">
            Elegi tu talle
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {totalStock(product)} {totalStock(product) === 1 ? 'unidad' : 'unidades'}
          </p>
        </div>

        <SizeSelector sizes={product.sizes} value={size} onChange={setSize} />

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
      <details className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">
          Ver mensaje que se va a enviar
        </summary>
        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {preview}
        </p>
      </details>
    </div>
  )
}
