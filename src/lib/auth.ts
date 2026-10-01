import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * AUTENTICACION SIMPLIFICADA DEL PANEL ADMIN — SOLO SERVIDOR.
 *
 * Es una implementacion didactica, no un sistema de identidad:
 * - Credenciales por variables de entorno (con defaults de desarrollo).
 * - Sesion stateless firmada con HMAC-SHA256 usando `node:crypto`
 *   (no agrega dependencias; en produccion se suele usar `jose` o `iron-session`).
 * - La cookie es `httpOnly` + `sameSite=lax`, con expiracion de 8 horas.
 *
 * Para produccion: rota SESSION_SECRET, usa HTTPS y considera un proveedor
 * de identidad en lugar de credenciales locales.
 */

export const SESSION_COOKIE = 'tm_admin_session'

/** Duracion de la sesion en segundos (8 horas). */
export const SESSION_TTL_SECONDS = 60 * 60 * 8

export const ADMIN_USER = process.env.ADMIN_USER ?? 'admin'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123'

const SEPARATOR = '|'

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-secret-cambialo-en-produccion'
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

/** Compara credenciales en tiempo (casi) constante. */
export function verifyCredentials(username: string, password: string): boolean {
  const userOk = safeEqual(username, ADMIN_USER)
  const passOk = safeEqual(password, ADMIN_PASSWORD)
  return userOk && passOk
}

export function createSessionToken(username: string): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  const payload = `${encodeURIComponent(username)}${SEPARATOR}${expiresAt}`
  return `${payload}${SEPARATOR}${sign(payload)}`
}

/** Devuelve el usuario de la sesion o `null` si es invalida / vencio. */
export function verifySessionToken(token: string | undefined | null): { username: string } | null {
  if (!token) return null

  const parts = token.split(SEPARATOR)
  if (parts.length !== 3) return null

  const [encodedUser, expiresAt, signature] = parts
  if (!safeEqual(signature, sign(`${encodedUser}${SEPARATOR}${expiresAt}`))) return null

  const expiry = Number(expiresAt)
  if (!Number.isFinite(expiry) || expiry < Date.now()) return null

  return { username: decodeURIComponent(encodedUser) }
}
