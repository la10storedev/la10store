'use client'

import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type ConfirmDialogType = 'danger' | 'warning' | 'info'

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: ConfirmDialogType
  /** Icono decorativo arriba del titulo. Si no se pasa, se usa el icono por defecto segun `type`. */
  icon?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
}

const DEFAULT_ICONS: Record<ConfirmDialogType, ReactNode> = {
  danger: (
    <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
      <AlertTriangle className="size-6" />
    </div>
  ),
  warning: (
    <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
      <AlertCircle className="size-6" />
    </div>
  ),
  info: (
    <div className="flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <Info className="size-6" />
    </div>
  ),
}

const CONFIRM_VARIANT: Record<ConfirmDialogType, 'danger' | 'primary'> = {
  danger: 'danger',
  warning: 'primary',
  info: 'primary',
}

/**
 * Modal de confirmacion centrado con overlay oscuro y backdrop-blur.
 * Se cierra con Escape, click en el overlay o el boton "Cancelar".
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  icon,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}: ConfirmDialogProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const resolvedIcon = icon ?? DEFAULT_ICONS[type]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-overlay-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-confirm-in"
      >
        {resolvedIcon ? <div className="mb-4">{resolvedIcon}</div> : null}
        <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={CONFIRM_VARIANT[type]} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}