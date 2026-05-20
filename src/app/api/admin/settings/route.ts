export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { getBookingWindowDays, setBookingWindowDays } from '@/lib/db/bookings'

const DEFAULT_WINDOW = 5

export async function GET() {
  try {
    const value = await getBookingWindowDays()
    return NextResponse.json({ booking_window_days: value })
  } catch (err) {
    console.error('[admin/settings GET]', err)
    return NextResponse.json({ booking_window_days: DEFAULT_WINDOW })
  }
}

export async function PATCH(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { booking_window_days } = body as { booking_window_days?: number }

  if (
    booking_window_days == null ||
    !Number.isInteger(booking_window_days) ||
    booking_window_days < 1 ||
    booking_window_days > 30
  ) {
    return NextResponse.json({ error: 'booking_window_days must be an integer between 1 and 30' }, { status: 400 })
  }

  try {
    await setBookingWindowDays(booking_window_days)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/settings PATCH] full error:', JSON.stringify(err, null, 2))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
