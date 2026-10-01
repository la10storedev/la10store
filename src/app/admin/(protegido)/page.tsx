import Link from 'next/link'
import { cookies } from 'next/headers'
import { ArrowUpRight, Layers, Package, Palette, Plus, Star, Store, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import { LOW_STOCK_THRESHOLD, totalStock } from '@/lib/products'
import { getAllProducts } from '@/lib/products-store'

/**
 * DASHBOARD DEL PANEL.
 *
 * Server Component: lee el catalogo completo (visibles + ocultos) y calcula las
 * metricas al vuelo. El nombre de usuario se vuelve a leer de la cookie porque
 * los layouts no pueden pasar props a las paginas; el layout padre ya valido la
 * sesion, asi que aca nunca deberia ser `null`.
 */
export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)

  const products = await getAllProducts({ includeHidden: true })

  const totalProducts = products.length
  const unitsInStock = products.reduce((acc, product) => acc + totalStock(product), 0)
  const lowStockCount = products.filter((product) => totalStock(product) < LOW_STOCK_THRESHOLD).length
  const featuredCount = products.filter((product) => product.featured).length

  return (
    <div className="flex flex-col gap-8">
      {/* Bienvenida */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Bienvenido, {session?.username ?? 'admin'}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Este es el resumen de tu tienda. Desde aca controlas el catalogo, el stock y la apariencia.
        </p>
      </section>

      {/* Metricas */}
      <section aria-labelledby="metricas-heading">
        <h2 id="metricas-heading" className="sr-only">
          Metricas
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total productos" value={totalProducts} icon={Package} hint="Visibles y ocultos" />
          <Stat label="Unidades en stock" value={unitsInStock} icon={Layers} hint="Suma de todos los talles" />
          <Stat
            label="Stock bajo"
            value={lowStockCount}
            icon={TriangleAlert}
            tone={lowStockCount > 0 ? 'warning' : 'neutral'}
            hint={`Menos de ${LOW_STOCK_THRESHOLD} unidades en total`}
          />
          <Stat label="Destacados" value={featuredCount} icon={Star} hint="En el catalogo publico" />
        </dl>
      </section>

      {/* Accesos rapidos */}
      <section aria-labelledby="accesos-heading">
        <h2
          id="accesos-heading"
          className="text-sm font-bold uppercase tracking-wide text-zinc-500"
        >
          Accesos rapidos
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <QuickAction
            href="/admin/productos/nuevo"
            label="Nueva camiseta"
            description="Cargar un producto al catalogo"
            icon={Plus}
          />
          <QuickAction
            href="/admin/apariencia"
            label="Editar hero"
            description="Personalizar la portada de la tienda"
            icon={Palette}
          />
          <QuickAction
            href="/"
            label="Ver tienda"
            description="Abrir el catalogo publico en otra pestana"
            icon={Store}
            external
          />
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: number
  icon: LucideIcon
  hint?: string
  tone?: 'neutral' | 'warning' | 'danger'
}) {
  const tones = {
    neutral: 'text-zinc-900',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  }
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
        <dd className={['mt-1 text-2xl font-bold', tones[tone]].join(' ')}>{value}</dd>
        {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
      </div>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-500">
        <Icon className="size-4" aria-hidden />
      </span>
    </div>
  )
}

function QuickAction({
  href,
  label,
  description,
  icon: Icon,
  external = false,
}: {
  href: string
  label: string
  description: string
  icon: LucideIcon
  external?: boolean
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-4 transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900">{label}</span>
        <span className="block truncate text-xs text-zinc-500">{description}</span>
      </span>
      <ArrowUpRight
        className="ml-auto size-4 shrink-0 text-zinc-300 transition group-hover:text-zinc-600"
        aria-hidden
      />
    </Link>
  )
}