'use client'

import { useRef, useState } from 'react'
import { deleteProductAction } from '@/app/admin/actions/products'
import { Button } from '@/components/ui/Button'
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog'

type DeleteProductFormProps = {
  id: string
  name: string
}

/**
 * Boton de eliminar con dialogo de confirmacion personalizado.
 *
 * El `<form action={...}>` sigue siendo una Server Action: sin JS el submit va
 * directo (progressive enhancement), y con JS el primer submit abre el modal
 * que confirma antes de enviar la accion.
 */
export function DeleteProductForm({ id, name }: DeleteProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const confirmedRef = useRef(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <form
        ref={formRef}
        action={deleteProductAction}
        onSubmit={(event) => {
          // El primer submit (click en "Eliminar") abre el modal en vez de
          // enviar; el segundo (boton del modal) deja pasar el envio real.
          if (confirmedRef.current) {
            confirmedRef.current = false
            return
          }
          event.preventDefault()
          setShowConfirm(true)
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="danger" size="sm">
          Eliminar
        </Button>
      </form>
      <ConfirmDeleteDialog
        productName={name}
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          confirmedRef.current = true
          formRef.current?.requestSubmit()
        }}
      />
    </>
  )
}