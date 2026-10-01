'use client'

import { useEffect } from 'react'
import { CircleCheck, CircleX, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

type ToastProps = {
  message: string
  type?: ToastType
  /** Se llama al expirar el auto-dismiss (3s) o al cerrar manualmente. */
  onClose: () => void
}

const icons: Record<ToastType, typeof CircleCheck> = {
  success: CircleCheck,
  error: CircleX,
  info: Info,
}

const borders: Record<ToastType, string> = {
  success: 'border-emerald-500',
  error: 'border-red-500',
  info: 'border-blue-500',
}

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-blue-600',
}

const AUTO_DISMISS_MS = 3000

/**
 * Notificacion transitoria en la esquina superior derecha.
 * Se auto-despide a los 3s y entra con un slide-in desde la derecha
 * (keyframes `toast-in` declarados en globals.css).
 */
export function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onClose])

  const Icon = icons[type]

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'pointer-events-auto fixed top-4 right-4 z-50 flex w-80 items-start gap-3',
        'rounded-lg border-l-4 bg-white p-4 shadow-lg animate-toast-in',
        borders[type],
      ].join(' ')}
    >
      <Icon className={['mt-0.5 size-5 shrink-0', iconColors[type]].join(' ')} aria-hidden="true" />
      <p className="flex-1 text-sm leading-snug text-zinc-800">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}