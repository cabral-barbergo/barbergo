import { createHash } from 'crypto'

export const ADMIN_COOKIE  = 'admin-auth'
export const COOKIE_MAX_AGE = 8 * 60 * 60 // 8 h in seconds

/** Deterministic cookie value derived from the secret (Node.js runtime). */
export function expectedCookieValue(): string {
  return createHash('sha256')
    .update((process.env.ADMIN_SECRET ?? '') + ':barbergo-admin')
    .digest('hex')
}

/** Parse a single named cookie out of a raw Cookie header string. */
function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match?.[1]
}

/** Returns true for Bearer token OR valid admin cookie. */
export function isAdminAuthorized(request: Request): boolean {
  const bearer = request.headers.get('Authorization')
  if (bearer === `Bearer ${process.env.ADMIN_SECRET}`) return true

  const cookieVal = parseCookie(request.headers.get('cookie'), ADMIN_COOKIE)
  return !!cookieVal && cookieVal === expectedCookieValue()
}
