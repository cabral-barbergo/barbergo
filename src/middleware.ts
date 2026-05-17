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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes, skip login + API
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
  matcher: ['/admin/:path*'],
}
