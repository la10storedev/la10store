import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { LoginForm } from '@/components/admin/LoginForm'

/**
 * LOGIN DEL PANEL.
 *
 * Vive fuera del grupo `(protegido)`, asi que no exige sesion.
 * El proxy la declara como ruta publica dentro de `/admin`.
 */

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams
  // Solo se aceptan rutas internas: evita redirecciones abiertas.
  const destination = next?.startsWith('/') ? next : '/admin'

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Columna informativa (oculta en movil) */}
      <div className="hidden flex-col justify-between bg-zinc-900 p-12 text-white lg:flex">
        <Logo tone="light" />
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-black tracking-tight">Panel de control</h1>
          <p className="max-w-sm text-zinc-400">
            Gestion del catalogo: alta de camisetas, imagenes, talles y stock. Los cambios se reflejan
            al instante en la tienda.
          </p>
        </div>
        <p className="text-xs text-zinc-500">Acceso restringido. Uso interno.</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Iniciar sesion</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Ingresa para administrar el catalogo de camisetas.
          </p>

          <div className="mt-6">
            <LoginForm next={destination} />
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            <Link href="/" className="underline underline-offset-4 hover:text-zinc-800">
              Volver a la tienda
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
