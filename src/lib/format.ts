/**
 * Utilidades de formato para la capa de presentacion.
 * Formateo eses (es-AR) para precios y fechas.
 */

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** `$ 89.000` */
export function formatPrice(value: number): string {
  return priceFormatter.format(value)
}

/** `10 dic 2025` */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

/**
 * Normaliza texto para busquedas: minusculas y sin tildes, para que
 * "seleccion" tambien encuentre "Selección".
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
