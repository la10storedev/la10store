'use client'

import { useState } from 'react'
import { JerseyPlaceholder } from '@/components/products/JerseyPlaceholder'
import type { ProductColors } from '@/types/product'

type ProductImageProps = {
  /** Ruta en `public/` (`/img/...`) o URL absoluta (Supabase / Cloudinary). */
  src?: string
  alt: string
  /** Colores del equipo: alimentan el placeholder. */
  colors: ProductColors
  /** Siglas del equipo para el placeholder. */
  initials?: string
  className?: string
  /** `true` para la imagen principal de una galeria. */
  priority?: boolean
  sizes?: string
}

/**
 * Imagen de producto con fallback a placeholder.
 *
 * Usa `<img>` a proposito en lugar de `next/image`:
 * 1. Necesitamos `onError` para caer al placeholder cuando la foto todavia no
 *    esta en `public/img/` — `next/image` no expone ese evento.
 * 2. Las imagenes son locales y chicas; la optimizacion no aporta tanto.
 *
 * Cuando migres las fotos a Supabase/Cloudinary podes volver a `next/image`
 * (recorda: en Next 16 `priority` fue deprecado, usá `preload`) y deconstruct
 * este componente en un `placeholder="blur"` con `blurDataURL`.
 */
export function ProductImage({
  src,
  alt,
  colors,
  initials,
  className = '',
  priority = false,
  sizes,
}: ProductImageProps) {
  // `src` no cambia durante la vida del producto, asi que alcanza con armar la
  // lista de candidatos una vez.
  const [candidate, setCandidate] = useState(0)
  const sources = src ? [src] : []
  const current = sources[candidate]

  if (!current) {
    return <JerseyPlaceholder colors={colors} initials={initials} className={className} />
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- fallback con onError, ver nota arriba */
    <img
      src={current}
      alt={alt}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      onError={() => setCandidate(1)}
    />
  )
}
