import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'

/** 404 global. En Next 16 se muestra dentro del layout de la ruta que fallo. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Error 404</p>
      <h1 className="text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">
        No encontramos esa pagina
      </h1>
      <p className="max-w-md text-sm text-zinc-600">
        Puede que la camiseta se haya eliminado del catalogo o que el link este incompleto.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Volver al catalogo</ButtonLink>
        <Link href="/#equipos" className="self-center text-sm font-medium text-zinc-600 hover:text-zinc-900">
          Ver equipos
        </Link>
      </div>
    </div>
  )
}
