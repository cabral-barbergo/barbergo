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

/** Returns true if the request carries a valid admin cookie. */
export function isAdminAuthorized(request: Request): boolean {
  const cookieVal = parseCookie(request.headers.get('cookie'), ADMIN_COOKIE)
  return !!cookieVal && cookieVal === expectedCookieValue()
}

/**
 * CSRF check for mutating requests (POST/PATCH/DELETE).
 * Returns null if the request is allowed, or a NextResponse with 415/403 if not.
 */
export function csrfCheck(request: Request): { status: number; error: string } | null {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return { status: 415, error: 'Unsupported Media Type' }
  }

  const origin = request.headers.get('origin')
  if (origin) {
    const host = request.headers.get('host')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const allowed = appUrl ? origin === appUrl : (host ? origin.includes(host) : false)
    if (!allowed) {
      return { status: 403, error: 'Forbidden' }
    }
  }

  return null
}
