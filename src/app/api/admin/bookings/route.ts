export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBookingsByDate } from '@/lib/db/bookings'
import { optimizeRoute, routeTotalDistance } from '@/lib/routing'
import { isAdminAuthorized } from '@/lib/adminAuth'

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const bookings = await getBookingsByDate(date)
    const route = optimizeRoute(bookings)

    return NextResponse.json({
      bookings: route,
      totalDistanceKm: routeTotalDistance(bookings),
    })
  } catch (err) {
    console.error('[admin/bookings GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
