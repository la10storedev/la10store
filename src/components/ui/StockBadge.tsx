import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { productStockStatus, stockStatusLabels } from '@/lib/products'
import type { Product } from '@/types/product'

const tones: Record<ReturnType<typeof productStockStatus>, BadgeTone> = {
  disponible: 'success',
  ultimas: 'warning',
  encargo: 'brand',
}

/**
 * Estado de stock de una camiseta.
 * Deriva el texto y el color del total de unidades, no de un campo guardado:
 * asi nunca puede quedar desincronizado con `sizes[].stock`.
 */
export function StockBadge({ product, className }: { product: Product; className?: string }) {
  const status = productStockStatus(product)
  return (
    <Badge tone={tones[status]} className={className}>
      {stockStatusLabels[status]}
    </Badge>
  )
}
