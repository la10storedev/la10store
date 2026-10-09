/**
 * Icono de Instagram como SVG inline.
 *
 * `lucide-react@1.49.0` (la version pinneada en este proyecto) todavia no
 * incluye un icono `Instagram`. Para evitar lockear el proyecto a una version
 * mas nueva, dibujo el glifo aca: camara con esquinas redondeadas y el punto
 * del visor.
 */
export function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  )
}
