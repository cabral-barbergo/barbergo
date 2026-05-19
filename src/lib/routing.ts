import type { Booking, AvailabilitySlot } from './types'

const EARTH_RADIUS_KM = 6371

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export function optimizeRoute(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => a.slot.localeCompare(b.slot))
}

export function routeTotalDistance(bookings: Booking[]): number {
  const route = optimizeRoute(bookings)
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += haversine(route[i - 1].lat, route[i - 1].lon, route[i].lat, route[i].lon)
  }
  return total
}

const PROXIMITY_MAX_KM = 0.6

export function canJoinDay(
  existingBookings: Booking[],
  newLat: number,
  newLon: number
): { ok: boolean } {
  if (existingBookings.length === 0) return { ok: true }

  const withinRange = existingBookings.some(
    (b) => haversine(newLat, newLon, b.lat, b.lon) <= PROXIMITY_MAX_KM
  )
  return { ok: withinRange }
}

export function isSlotAdjacent(slot: string, existingBookings: Booking[], allSlots: string[]): boolean {
  const takenIndices = existingBookings
    .map((b) => allSlots.indexOf(b.slot.substring(0, 5)))
    .filter((i) => i !== -1)

  const slotIdx = allSlots.indexOf(slot)
  if (slotIdx === -1) return false

  return takenIndices.some((i) => slotIdx === i - 1 || slotIdx === i + 1)
}

export function getAvailableSlotsForDay(
  bookings: Booking[],
  date: string,
  lat: number,
  lon: number,
  allSlots: string[]
): AvailabilitySlot[] {
  const dayBookings = bookings.filter((b) => b.date === date && b.status !== 'cancelled')
  const takenSlots = new Set(dayBookings.map((b) => b.slot.substring(0, 5)))
  const joinResult = canJoinDay(dayBookings, lat, lon)

  console.log(
    `[getAvailableSlotsForDay] date=${date} bookings=${dayBookings.length} taken=[${Array.from(takenSlots).join(',')}] geo=${joinResult.ok ? 'ok' : 'blocked'}`
  )

  return allSlots.map((slot) => {
    if (takenSlots.has(slot)) {
      console.log(`[getAvailableSlotsForDay] ${slot} → taken`)
      return { slot, status: 'taken' }
    }
    if (!joinResult.ok) {
      console.log(`[getAvailableSlotsForDay] ${slot} → blocked (proximity)`)
      return { slot, status: 'blocked' }
    }
    if (dayBookings.length > 0 && !isSlotAdjacent(slot, dayBookings, allSlots)) {
      console.log(`[getAvailableSlotsForDay] ${slot} → blocked (not adjacent)`)
      return { slot, status: 'blocked' }
    }
    console.log(`[getAvailableSlotsForDay] ${slot} → available`)
    return { slot, status: 'available' }
  })
}
