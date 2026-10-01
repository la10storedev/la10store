import { siteConfig } from '@/lib/site'

/**
 * La app NO procesa pagos: el "checkout" es un mensaje de WhatsApp
 * pre-armado con el producto y el talle elegido.
 *
 * wa.me exige el numero en formato internacional, solo digitos (sin `+`, sin espacios).
 */
export type WhatsAppMessageContext = {
  /** Nombre de la camiseta. */
  productName: string
  /** Talle elegido (opcional: se puede consultar sin elegir talle). */
  size?: string
  /** Precio referencial, aparece en el mensaje. */
  price?: number
  /** Referencia interna del producto, util para buscarlo en el panel. */
  productId?: string
}

function formatPriceForMessage(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(price)
}

/** Texto plano que se precarga en el chat. */
export function buildWhatsAppMessage(ctx: WhatsAppMessageContext): string {
  const lines = [
    `Hola! Quiero consultar por la camiseta "${ctx.productName}"`,
    ctx.size ? `Talle: ${ctx.size}` : null,
    ctx.price ? `Precio de referencia: ${formatPriceForMessage(ctx.price)}` : null,
    ctx.productId ? `Ref: ${ctx.productId}` : null,
    'Esta disponible?',
  ].filter((line): line is string => Boolean(line))

  return lines.join('\n')
}

/**
 * Link completo `https://wa.me/<numero>?text=<mensaje codificado>`.
 *
 * Recibe el número ya resuelto: los server components lo leen de
 * `site_settings` (vía `getWhatsAppNumber` de products-store) y los client
 * components lo reciben como prop. Si el número llega vacío, cae al default
 * de `siteConfig`.
 */
export function buildWhatsAppLink(
  ctx: WhatsAppMessageContext,
  number: string = siteConfig.whatsappNumber,
): string {
  const digits = (number || siteConfig.whatsappNumber).replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(buildWhatsAppMessage(ctx))}`
}
