import { siteConfig } from '@/lib/site'

/**
 * La app NO procesa pagos: el "checkout" es un mensaje de WhatsApp
 * pre-armado con el producto y el talle elegido.
 *
 * wa.me exige el numero en formato internacional, solo digitos (sin `+`, sin espacios).
 *
 * El cuerpo del mensaje es una plantilla editada por el admin en
 * `/admin/contacto` y guardada en `site_settings` bajo la clave
 * `whatsapp_message`. Si la fila esta vacia o falta, se usa `DEFAULT_WHATSAPP_MESSAGE`.
 *
 * Placeholders soportados (se reemplazan linea por linea):
 *   {productName}  - nombre de la camiseta
 *   {size}         - talle elegido (opcional)
 *   {price}        - precio formateado en ARS (opcional)
 *   {productId}    - referencia interna del producto (opcional)
 *
 * Si el valor de un placeholder es vacio, la linea completa se descarta
 * para que el admin pueda "apagar" un dato quitandolo de la plantilla.
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

/** Plantilla por defecto: el mismo texto que la app usaba antes de ser editable. */
export const DEFAULT_WHATSAPP_MESSAGE = [
  'Hola! Quiero consultar por "{productName}"',
  'Talle: {size}',
  'Precio de referencia: {price}',
  'Ref: {productId}',
  'Esta disponible?',
].join('\n')

function formatPriceForMessage(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(price)
}

function replacePlaceholders(line: string, ctx: WhatsAppMessageContext): string {
  return line
    .replaceAll('{productName}', ctx.productName)
    .replaceAll('{size}', ctx.size ?? '')
    .replaceAll('{price}', ctx.price ? formatPriceForMessage(ctx.price) : '')
    .replaceAll('{productId}', ctx.productId ?? '')
}

/**
 * Texto plano que se precarga en el chat.
 *
 * Si la plantilla llega vacia, cae a `DEFAULT_WHATSAPP_MESSAGE`. Las lineas
 * cuyo placeholder resolvio vacio se descartan (mismo comportamiento que
 * antes, ahora configurable desde el admin).
 */
export function buildWhatsAppMessage(
  ctx: WhatsAppMessageContext,
  template: string = DEFAULT_WHATSAPP_MESSAGE,
): string {
  const source = template && template.trim() !== '' ? template : DEFAULT_WHATSAPP_MESSAGE

  return source
    .split('\n')
    .map((line) => replacePlaceholders(line, ctx).trimEnd())
    .filter((line) => line.trim() !== '')
    .join('\n')
}

/**
 * Link completo `https://wa.me/<numero>?text=<mensaje codificado>`.
 *
 * Recibe el número y la plantilla ya resueltos: los server components los
 * leen de `site_settings` (vía `getWhatsAppNumber` y `getWhatsAppMessage`
 * de products-store) y los client components los reciben como props. Si el
 * número llega vacío, cae al default de `siteConfig`. Si la plantilla llega
 * vacia, `buildWhatsAppMessage` usa el default.
 */
export function buildWhatsAppLink(
  ctx: WhatsAppMessageContext,
  number: string = siteConfig.whatsappNumber,
  template: string = DEFAULT_WHATSAPP_MESSAGE,
): string {
  const digits = (number || siteConfig.whatsappNumber).replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(buildWhatsAppMessage(ctx, template))}`
}
