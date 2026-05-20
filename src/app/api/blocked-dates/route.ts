export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBlockedDays } from '@/lib/db/bookings'

export async function GET() {
  try {
    const days = await getBlockedDays()
    return NextResponse.json(days.map((d) => d.date))
  } catch (err) {
    console.error('[blocked-dates GET]', err)
    return NextResponse.json([])
  }
}
