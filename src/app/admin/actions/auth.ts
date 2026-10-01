'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS, verifyCredentials } from '@/lib/auth'

/**
 * Acciones de sesion del panel admin.
 *
 * El proxy (`src/proxy.ts`) ya bloquea `/admin/*`, pero estas acciones son
 * alcanzables por POST directo, asi que `requireSession` se vuelve a usar en
 * cada mutacion de productos.
 */

export type LoginState = {
  error?: string
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/admin')

  if (!verifyCredentials(username, password)) {
    // Volvemos estado en vez de redirigir: el usuario ve el error en el lugar.
    return { error: 'Usuario o contrasena incorrectos.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  })

  // `redirect` lanza una excepcion controlada por Next: va al final y nunca
  // dentro de un try/catch.
  redirect(next.startsWith('/') ? next : '/admin')
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/admin/login')
}
