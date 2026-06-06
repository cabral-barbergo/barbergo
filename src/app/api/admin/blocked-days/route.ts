import { NextResponse } from 'next/server'
import { isAdminAuthorized, csrfCheck } from '@/lib/adminAuth'
import { getBlockedDays, blockDay, unblockDay } from '@/lib/db/bookings'

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await getBlockedDays())
  } catch (err) {
    console.error('[admin/blocked-days GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const csrf = csrfCheck(request)
  if (csrf) return NextResponse.json({ error: csrf.error }, { status: csrf.status })

  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { date, reason } = body as { date?: string; reason?: string }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 })
  }
  try {
    await blockDay(date, reason ?? '')
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Este día ya está bloqueado' }, { status: 409 })
    }
    console.error('[admin/blocked-days POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const csrf = csrfCheck(request)
  if (csrf) return NextResponse.json({ error: csrf.error }, { status: csrf.status })

  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { date } = body as { date?: string }
  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }
  try {
    await unblockDay(date)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/blocked-days DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
