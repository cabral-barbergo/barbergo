import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { getBlockedSlots, blockSlot, unblockSlot } from '@/lib/db/bookings'

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 })
  }

  try {
    const slots = await getBlockedSlots(date)
    return NextResponse.json(slots)
  } catch (err) {
    console.error('[admin/blocked-slots GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { date, slot, reason } = body as { date?: string; slot?: string; reason?: string }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !slot) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) and slot are required' }, { status: 400 })
  }

  try {
    await blockSlot(date, slot, reason)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('unique') || msg.includes('duplicate') || (err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Este slot ya está bloqueado' }, { status: 409 })
    }
    console.error('[admin/blocked-slots POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { date, slot } = body as { date?: string; slot?: string }

  if (!date || !slot) {
    return NextResponse.json({ error: 'date and slot are required' }, { status: 400 })
  }

  try {
    await unblockSlot(date, slot)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/blocked-slots DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
