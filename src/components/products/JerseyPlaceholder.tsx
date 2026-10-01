import { useId } from 'react'
import type { ProductColors } from '@/types/product'

type JerseyPlaceholderProps = {
  colors: ProductColors
  /** Texto corto (siglas del equipo) que se imprime en el placeholder. */
  initials?: string
  className?: string
}

/**
 * Placeholder SVG de una camiseta, generado con los colores del producto.
 *
 * Se usa como fallback cuando la imagen real todavia no esta en `public/img/`
 * (ver `ProductImage`). Los `id` de los `<defs>` se generan con `useId()`
 * para que varias instancias en la misma pagina no colisionen.
 *
 * Estilo limpio y sobrio: fondo casi blanco y silueta nitida.
 */
export function JerseyPlaceholder({ colors, initials = '?', className = '' }: JerseyPlaceholderProps) {
  const uid = useId().replace(/:/g, '')
  const gradientId = `grad-${uid}`
  const clipId = `clip-${uid}`

  // Silueta de la camiseta (hombros, mangas y torso).
  const jerseyPath =
    'M148 84 L112 100 L74 142 L110 178 L130 158 L130 322 Q200 342 270 322 L270 158 L290 178 L326 142 L288 100 L252 84 Q200 118 148 84 Z'

  return (
    <svg
      viewBox="0 0 400 400"
      className={['size-full', className].filter(Boolean).join(' ')}
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={jerseyPath} />
        </clipPath>
      </defs>

      <rect width="400" height="400" fill="#fafafa" />

      <g clipPath={`url(#${clipId})`}>
        <rect width="400" height="400" fill={`url(#${gradientId})`} />
        {/* Franja horizontal: detalle decorativo de la camiseta. */}
        <rect x="0" y="150" width="400" height="36" fill={colors.secondary} opacity="0.7" />
      </g>

      {/* Contorno + cuello */}
      <path d={jerseyPath} fill="none" stroke="rgb(0 0 0 / 0.12)" strokeWidth="3" />
      <path
        d="M168 92 L200 128 L232 92"
        fill="none"
        stroke="rgb(0 0 0 / 0.22)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Siglas del equipo */}
      <text
        x="200"
        y="250"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="34"
        fontWeight="800"
        fill="rgb(0 0 0 / 0.7)"
      >
        {initials.slice(0, 3)}
      </text>
    </svg>
  )
}
