import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE = 'admin-auth'

/** Same computation as adminAuth.ts but with Web Crypto (Edge runtime). */
async function expectedToken(): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest(
    'SHA-256',
    enc.encode((process.env.ADMIN_SECRET ?? '') + ':barbergo-admin')
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Sliding window, in-memory (per-instance). Good enough for edge/serverless
// where each instance handles a subset of traffic. No Node.js built-ins needed.

interface RateEntry {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateEntry>()

interface RateLimitRule {
  maxRequests: number
  windowMs: number
}

function checkRateLimit(key: string, rule: RateLimitRule): boolean {
  const now = Date.now()
  const windowStart = now - rule.windowMs

  const entry = rateLimitStore.get(key) ?? { timestamps: [] }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  if (entry.timestamps.length >= rule.maxRequests) {
    rateLimitStore.set(key, entry)
    return false // rate limit exceeded
  }

  entry.timestamps.push(now)
  rateLimitStore.set(key, entry)
  return true // allowed
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP.trim()
  return 'unknown'
}

const RATE_LIMITS: Record<string, RateLimitRule> = {
  '/api/bookings:POST':     { maxRequests: 5,  windowMs: 60 * 1000 },
  '/api/geocode:POST':      { maxRequests: 20, windowMs: 60 * 1000 },
  '/api/admin/auth:POST':   { maxRequests: 5,  windowMs: 15 * 60 * 1000 },
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method.toUpperCase()

  // ── Rate limiting ──────────────────────────────────────────────
  const rateLimitKey = `${pathname}:${method}`
  const rule = RATE_LIMITS[rateLimitKey]
  if (rule) {
    const ip = getClientIP(request)
    const allowed = checkRateLimit(`${ip}:${rateLimitKey}`, rule)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rule.windowMs / 1000)) } }
      )
    }
  }

  // ── Admin route protection ─────────────────────────────────────
  if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)
  if (!cookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const expected = await expectedToken()
  if (cookie.value !== expected) {
    const res = NextResponse.redirect(new URL('/admin/login', request.url))
    res.cookies.delete(ADMIN_COOKIE)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/bookings', '/api/geocode', '/api/admin/auth'],
}
