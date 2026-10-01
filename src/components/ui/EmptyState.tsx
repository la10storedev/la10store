import type { ReactNode } from 'react'
import { ButtonLink } from '@/components/ui/Button'

/** Estado vacio reutilizable (catalogo sin resultados, panel sin productos...). */
type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-zinc-300 px-6 py-16 text-center">
      <p className="text-base font-bold uppercase tracking-tight text-zinc-950">{title}</p>
      {description ? <p className="max-w-sm text-sm text-zinc-500">{description}</p> : null}
      {action ?? (
        <ButtonLink href="/" variant="outline" size="sm" className="mt-2">
          Volver al catalogo
        </ButtonLink>
      )}
    </div>
  )
}