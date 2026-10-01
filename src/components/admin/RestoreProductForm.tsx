import { restoreProductAction } from '@/app/admin/actions/products'
import { Button } from '@/components/ui/Button'

type RestoreProductFormProps = {
  id: string
}

/**
 * Boton "Restaurar" de la seccion Eliminados. Server Action via `<form>`:
 * funciona sin JS (progressive enhancement).
 */
export function RestoreProductForm({ id }: RestoreProductFormProps) {
  return (
    <form action={restoreProductAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm">
        Restaurar
      </Button>
    </form>
  )
}