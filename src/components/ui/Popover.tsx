'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type PopoverProps = {
  trigger: ReactNode
  children: ReactNode
  /** Controlado: si se pasa, el estado lo maneja el padre via `onOpenChange`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Popover generico posicionado debajo del trigger, centrado horizontalmente.
 * Se cierra con click fuera o Escape.
 */
export function Popover({ trigger, children, open, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const close = () => {
    if (isControlled) onOpenChange?.(false)
    else setInternalOpen(false)
  }

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, close])

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <span
        className="inline-flex cursor-pointer"
        onClick={() => {
          if (isControlled) onOpenChange?.(!isOpen)
          else setInternalOpen((prev) => !prev)
        }}
      >
        {trigger}
      </span>
      {isOpen ? (
        <div className="absolute top-full left-1/2 z-20 mt-2 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
          {children}
        </div>
      ) : null}
    </div>
  )
}