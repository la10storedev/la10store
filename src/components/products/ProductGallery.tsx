'use client'

import { useState } from 'react'
import { ProductImage } from '@/components/products/ProductImage'
import type { ProductColors } from '@/types/product'

export type GalleryImage = {
  src?: string
  alt: string
}

type ProductGalleryProps = {
  images: GalleryImage[]
  colors: ProductColors
  initials?: string
}

/**
 * Galeria de imagenes del producto.
 * - Movil: imagen principal + miniaturas en scroll horizontal.
 * - Desktop: imagen grande + columna de miniaturas a la izquierda.
 *
 * Es un Client Component porque la imagen visible depende del indice elegido.
 * Estetica: sin esquinas redondeadas; la imagen ocupa el ancho disponible.
 */
export function ProductGallery({ images, colors, initials }: ProductGalleryProps) {
  const [index, setIndex] = useState(0)
  const safeIndex = Math.min(index, images.length - 1)
  const active = images[safeIndex]

  if (!active) {
    return (
      <div className="aspect-[4/5] w-full overflow-hidden bg-zinc-100">
        <ProductImage alt="Camiseta" colors={colors} initials={initials} className="size-full object-cover" />
      </div>
    )
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {/* Miniaturas */}
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1 sm:w-20 sm:shrink-0 sm:flex-col sm:overflow-visible sm:pb-0">
          {images.map((image, imageIndex) => {
            const selected = imageIndex === safeIndex
            return (
              <li key={`${image.src ?? 'placeholder'}-${imageIndex}`} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(imageIndex)}
                  aria-current={selected}
                  aria-label={`Ver imagen ${imageIndex + 1}`}
                  className={[
                    'block size-20 overflow-hidden border bg-zinc-100 transition-colors',
                    selected ? 'border-zinc-950' : 'border-transparent hover:border-zinc-300',
                  ].join(' ')}
                >
                  <ProductImage
                    src={image.src}
                    alt={image.alt}
                    colors={colors}
                    initials={initials}
                    className="size-full object-cover"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {/* Imagen principal */}
      <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-zinc-100">
        <ProductImage
          src={active.src}
          alt={active.alt}
          colors={colors}
          initials={initials}
          priority
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="size-full object-cover"
        />

        {images.length > 1 ? (
          <p className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 text-[11px] font-medium tracking-wide text-zinc-900">
            {safeIndex + 1} / {images.length}
          </p>
        ) : null}
      </div>
    </div>
  )
}
