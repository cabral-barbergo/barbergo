export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { getBookingById, updateBookingById, cancelBookingById, rescheduleBooking } from '@/lib/db/bookings'
import { notifyBookingCancelled, notifyBookingRescheduled } from '@/lib/notify'

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

  const { clientName, address, lat, lon, date, slot } = body as {
    clientName?: string
    address?: string
    lat?: number
    lon?: number
    date?: string
    slot?: string
  }

  try {
    if (date !== undefined || slot !== undefined) {
      const booking = await getBookingById(params.id)
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

      const newDate = date ?? booking.date
      const newSlot = slot ?? booking.slot

      await rescheduleBooking(params.id, newDate, newSlot)

      if (booking.clientPhone) {
        notifyBookingRescheduled(booking, newDate, newSlot).catch((err) =>
          console.error('[notify] admin rescheduling:', err)
        )
      }
    } else {
      await updateBookingById(params.id, { clientName, address, lat, lon })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.name === 'SlotConflictError') {
      return NextResponse.json({ error: 'Este horario ya está ocupado' }, { status: 409 })
    }
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
