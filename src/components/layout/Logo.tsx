import Image from 'next/image'
import Link from 'next/link'
import { siteConfig } from '@/lib/site'

type LogoProps = {
  /**
   * Color de la tinta del logo, no del fondo:
   * - `dark` (por defecto): logo negro → para fondos CLAROS (navbar).
   * - `light`: logo blanco → para fondos OSCUROS (footer, panel de login).
   */
  tone?: 'dark' | 'light'
  /**
   * Clases aplicadas al `<Image>` (no al wrapper). Sirve para fijar la altura
   * y para esconder el logo en un tema (p. ej. `dark:hidden`). Si no se pasa
   * nada, queda el tamano por defecto (h-12 en mobile, h-14 en desktop).
   */
  className?: string
  /**
   * `true` en el logo del navbar (above the fold): pre-carga la imagen.
   * En Next 16 `priority` esta deprecado, se usa `preload`.
   */
  preload?: boolean
}

/**
 * Logo real de la marca (PNG transparente) con el link de inicio.
 *
 * Archivos (los nombres refieren al fondo para el que sirven):
 * - `/img/logo-claro.png`  → tinta negra, para fondos CLAROS.
 * - `/img/logo-oscuro.png` → tinta blanca, para fondos OSCUROS.
 *
 * Tamano por defecto: ~48px en mobile y ~56px en desktop, ancho automatico.
 * Los call sites pueden sobreescribirlo via `className` (p. ej. el navbar
 * pasa `h-10 md:h-12` para una cabecera mas fina).
 */
export function Logo({ tone = 'dark', className, preload = false }: LogoProps) {
  const src = tone === 'light' ? '/img/logo-oscuro.png' : '/img/logo-claro.png'
  const sizeClass = className ?? 'h-12 w-auto md:h-14'

  return (
    <Link
      href="/"
      className="group inline-flex items-center"
      aria-label={`${siteConfig.name} — inicio`}
    >
      <Image
        src={src}
        alt={siteConfig.name}
        width={200}
        height={56}
        preload={preload}
        sizes="200px"
        className={sizeClass}
      />
    </Link>
  )
}
