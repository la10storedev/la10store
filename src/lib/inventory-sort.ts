import { totalStock } from '@/lib/products'
import type { Product } from '@/types/product'

/**
 * Ordenamiento del inventario del admin (tabla desktop y cards mobile).
 * Logica pura compartida por `InventoryTable` y `InventoryCards`.
 */

export type SortField = 'name' | 'price' | 'stock'
export type SortDirection = 'asc' | 'desc'

/** Orden canonico de los botones/headers de ordenamiento. */
export const SORT_FIELDS: SortField[] = ['name', 'price', 'stock']

export const SORT_LABELS: Record<SortField, string> = {
  name: 'Nombre',
  price: 'Precio',
  stock: 'Stock',
}

/** Devuelve una copia ordenada (no muta `products`). */
export function sortInventory(
  products: Product[],
  field: SortField,
  direction: SortDirection,
): Product[] {
  const dir = direction === 'asc' ? 1 : -1

  return [...products].sort((a, b) => {
    switch (field) {
      case 'name':
        return a.name.localeCompare(b.name, 'es') * dir
      case 'price':
        return (a.price - b.price) * dir
      case 'stock':
        return (totalStock(a) - totalStock(b)) * dir
    }
  })
}