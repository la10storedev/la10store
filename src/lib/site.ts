/**
 * Configuracion global del sitio.
 */
export const siteConfig = {
  /** Nombre de la marca. */
  name: 'La 10 Store',
  /** Siglas / monograma que se usa como fallback de logo. */
  shortName: 'L10',
  /** Bajada corta que se muestra en el header y en el SEO. */
  tagline: 'Tu camiseta, tu pasión',
  /** Descripcion larga para metadata / SEO. */
  description:
    'Camisetas de fútbol de selecciones y clubes. Enviamos a todo el país y coordinamos la compra directa por WhatsApp.',
  /**
   * Numero de WhatsApp en formato internacional, solo digitos y sin `+`.
   * Default: placeholder. Override con NEXT_PUBLIC_WHATSAPP_NUMBER.
   */
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5491123456789',
  /** Instagram (placeholder) para el pie de pagina. */
  instagramUrl: 'https://instagram.com/tu-marca',
  /** Email de contacto (placeholder). */
  contactEmail: 'holo@tumarca.com',
} as const