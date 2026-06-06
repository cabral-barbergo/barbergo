import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, COOKIE_MAX_AGE, expectedCookieValue, csrfCheck } from '@/lib/adminAuth'

export async function POST(request: Request) {
  const csrf = csrfCheck(request)
  if (csrf) return NextResponse.json({ error: csrf.error }, { status: csrf.status })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { password } = body as { password?: string }
  if (!password || password !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, expectedCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(ADMIN_COOKIE)
  return res
}
