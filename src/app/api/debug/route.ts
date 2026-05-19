import { getBookingsByDate, getActiveSlots, getBlockedSlots, getServiceZone } from '@/lib/db/bookings'
import { getAvailableSlotsForDay, groupSlotsIntoBlocks, getEffectiveLocation } from '@/lib/routing'
import { jsToAppDay } from '@/lib/slots'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || '2026-05-27'
  const lat = parseFloat(searchParams.get('lat') || '-34.6519')
  const lon = parseFloat(searchParams.get('lon') || '-59.4307')

  const jsDay = new Date(`${date}T12:00:00`).getDay()
  const appDay = jsToAppDay(jsDay)

  const [bookings, activeSlots, blockedSlots, zone] = await Promise.all([
    getBookingsByDate(date),
    getActiveSlots(appDay),
    getBlockedSlots(date),
    getServiceZone(),
  ])

  const eff = getEffectiveLocation(lat, lon, zone)
  const blocks = groupSlotsIntoBlocks(activeSlots)
  const result = getAvailableSlotsForDay(bookings, date, eff.lat, eff.lon, activeSlots, blockedSlots, zone)

  return Response.json({
    date,
    input: { lat, lon },
    zone: {
      centerLat: zone.centerLat,
      centerLon: zone.centerLon,
      polygonVertices: zone.polygon.length,
    },
    effectiveLocation: eff,
    appDay,
    bookings: bookings.map((b) => ({ slot: b.slot, status: b.status, lat: b.lat, lon: b.lon })),
    activeSlots,
    blockedSlots,
    blocks,
    result,
  })
}
