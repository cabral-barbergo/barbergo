import { getBookingsByDate, getActiveSlots, getBlockedSlots } from '@/lib/db/bookings'
import { getAvailableSlotsForDay, groupSlotsIntoBlocks } from '@/lib/routing'
import { jsToAppDay } from '@/lib/slots'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || '2026-05-27'
  const lat = parseFloat(searchParams.get('lat') || '-34.6519')
  const lon = parseFloat(searchParams.get('lon') || '-59.4307')

  const jsDay = new Date(`${date}T12:00:00`).getDay()
  const appDay = jsToAppDay(jsDay)

  const [bookings, activeSlots, blockedSlots] = await Promise.all([
    getBookingsByDate(date),
    getActiveSlots(appDay),
    getBlockedSlots(date),
  ])

  const blocks = groupSlotsIntoBlocks(activeSlots)
  const result = getAvailableSlotsForDay(bookings, date, lat, lon, activeSlots, blockedSlots)

  return Response.json({
    date,
    lat,
    lon,
    appDay,
    bookings: bookings.map((b) => ({ slot: b.slot, status: b.status, lat: b.lat, lon: b.lon })),
    activeSlots,
    blockedSlots,
    blocks,
    result,
  })
}
