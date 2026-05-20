export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { getBookingById, updateBookingById, cancelBookingById } from '@/lib/db/bookings'
import { notifyBookingCancelled } from '@/lib/notify'

interface Context {
  params: { id: string }
}

export async function PATCH(request: Request, { params }: Context) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { clientName, address, lat, lon } = body as {
    clientName?: string
    address?: string
    lat?: number
    lon?: number
  }

  try {
    await updateBookingById(params.id, { clientName, address, lat, lon })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/bookings PATCH id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!isAdminAuthorized(_request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const booking = await getBookingById(params.id)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    await cancelBookingById(params.id)

    if (booking.clientPhone) {
      notifyBookingCancelled(booking).catch((err) =>
        console.error('[notify] admin booking deletion:', err)
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/bookings DELETE id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
