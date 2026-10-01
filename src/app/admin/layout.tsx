/**
 * Layout base del panel admin.
 *
 * Es deliberadamente minimal: el chrome real (sidebar, barra superior, guard
 * de sesion) vive en el grupo `(protegido)`, asi `/admin/login` queda fuera
 * y puede mostrarse sin sesion.
 *
 * A diferencia del sitio publico, el panel no usa el Navbar/Footer de tienda:
 * es un layout independiente, como pidio el planteo original.
 */
export const metadata = {
  title: {
    default: 'Panel de administracion',
    template: '%s · Panel',
  },
  // El panel no debe indexarse.
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-zinc-100 text-zinc-900">{children}</div>
}
