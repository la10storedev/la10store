'use client'

import { TriangleAlert } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type ConfirmDeleteDialogProps = {
  open: boolean
  productName: string
  onClose: () => void
  onConfirm: () => void
}

/**
 * Modal de confirmacion para eliminar una camiseta (soft delete).
 *
 * Reutiliza `ConfirmDialog` con el icono de alerta naranja y el mensaje que
 * aclara que la camiseta se puede restaurar desde la seccion "Eliminados".
 */
export function ConfirmDeleteDialog({
  open,
  productName,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Eliminar camiseta"
      message={`¿Eliminar ${productName}? Podés restaurarla después desde la sección Eliminados.`}
      confirmLabel="Eliminar"
      cancelLabel="Cancelar"
      icon={
        <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <TriangleAlert className="size-6" aria-hidden />
        </span>
      }
    />
  )
}