import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

/**
 * Next 16 renombro `middleware.ts` a `proxy.ts` (se ejecuta en el runtime de
 * Node.js). Este archivo es la primera linea de defensa del panel admin:
 * si no hay sesion valida, redirige a `/admin/login`.
 *
 * IMPORTANTE (de la guia oficial de autenticacion de Next): el proxy sirve para
 * chequeos optimistas de sesion, no como mecanismo de seguridad unico. Por eso
 * cada Server Action de admin vuelve a verificar la sesion — una accion es
 * alcanzable por POST directo y no pasa por el proxy.
 */

/** Rutas dentro de `/admin` accesibles sin sesion. */
const PUBLIC_ROUTES = ['/admin/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (verifySessionToken(token)) {
    return NextResponse.next()
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/admin/login'
  loginUrl.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*'],
}
