import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/AdminNav'
import { ButtonLink } from '@/components/ui/Button'
import { logoutAction } from '@/app/admin/actions/auth'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import { getTrashCounts } from '@/lib/taxonomy-store'
import { siteConfig } from '@/lib/site'

/**
 * Layout del panel con sesion.
 *
 * El grupo `(protegido)` no agrega segmentos a la URL, asi que las rutas siguen
 * siendo `/admin`, `/admin/productos/nuevo`, etc.
 *
 * El proxy ya redirige a /admin/login sin cookie valida; este check es la
 * segunda linea de defensa y evita que el layout se renderice sin datos de
 * sesion. OJO: los layouts no se re-renderizan al navegar, por eso las
 * acciones vuelven a validar (ver `requireSession` en actions/products.ts).
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)

  if (!session) {
    redirect('/admin/login?next=/admin')
  }

  // Para mostrar el link "Eliminados" en la nav solo cuando hay algo en la
  // papelera unificada (camisetas + equipos + ligas). Las acciones de delete /
  // restore revalidan esta parte del layout.
  const trashCounts = await getTrashCounts()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Barra superior */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="group flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-lg bg-zinc-900 text-sm font-black tracking-tight text-white transition group-hover:bg-zinc-700"
              >
                {siteConfig.shortName}
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-zinc-900">Panel de control</span>
                <span className="hidden text-[11px] text-zinc-400 sm:block">{siteConfig.name}</span>
              </span>
            </Link>

            <span aria-hidden className="hidden h-6 w-px bg-zinc-200 md:block" />

            <ButtonLink href="/" variant="ghost" size="sm">
              Ver tienda
            </ButtonLink>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              Sesion: <strong className="font-semibold text-zinc-800">{session.username}</strong>
            </span>
            <span aria-hidden className="hidden h-6 w-px bg-zinc-200 sm:block" />
            {/* Logout por Server Action: no necesita JS. */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Navegacion secundaria */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
          <AdminNav deletedCount={trashCounts.total} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
