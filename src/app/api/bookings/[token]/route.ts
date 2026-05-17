import { NextResponse } from 'next/server'
import { getBookingByToken, cancelBooking } from '@/lib/db/bookings'
import { notifyBookingCancelled } from '@/lib/notify'

interface Context {
  params: { token: string }
}

export async function GET(_request: Request, { params }: Context) {
  const { token } = params

  try {
    const booking = await getBookingByToken(token)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    return NextResponse.json(booking)
  } catch (err) {
    console.error('[bookings GET token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const { token } = params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action } = body as { action?: string }
  if (action !== 'cancel') {
    return NextResponse.json({ error: 'action must be "cancel"' }, { status: 400 })
  }

  try {
    const booking = await getBookingByToken(token)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 409 })
    }

    await cancelBooking(token)

    notifyBookingCancelled(booking).catch((err) =>
      console.error('[notify] booking cancelled:', err)
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[bookings PATCH token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
