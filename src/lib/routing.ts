import type { Booking, AvailabilitySlot } from './types'

type LatLon = { lat: number; lon: number }

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

export function distanceToSegment(point: LatLon, segmentA: LatLon, segmentB: LatLon): number {
  const dx = segmentB.lon - segmentA.lon
  const dy = segmentB.lat - segmentA.lat

  if (dx === 0 && dy === 0) {
    return haversine(point.lat, point.lon, segmentA.lat, segmentA.lon)
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lon - segmentA.lon) * dx + (point.lat - segmentA.lat) * dy) /
        (dx * dx + dy * dy)
    )
  )

  const closest: LatLon = {
    lat: segmentA.lat + t * dy,
    lon: segmentA.lon + t * dx,
  }

  return haversine(point.lat, point.lon, closest.lat, closest.lon)
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

const CORRIDOR_MAX_KM = 3
const DETOUR_MAX_RATIO = 0.4

export function canJoinDay(
  existingBookings: Booking[],
  newLat: number,
  newLon: number
): { ok: boolean; reason?: 'corridor' | 'detour' } {
  if (existingBookings.length <= 1) return { ok: true }

  const route = optimizeRoute(existingBookings)
  const newPoint: LatLon = { lat: newLat, lon: newLon }

  // Corridor check: minimum distance from new point to any segment in the route
  let minSegmentDist = Infinity
  for (let i = 1; i < route.length; i++) {
    const d = distanceToSegment(
      newPoint,
      { lat: route[i - 1].lat, lon: route[i - 1].lon },
      { lat: route[i].lat, lon: route[i].lon }
    )
    if (d < minSegmentDist) minSegmentDist = d
  }

  if (minSegmentDist > CORRIDOR_MAX_KM) {
    return { ok: false, reason: 'corridor' }
  }

  // Detour check: compare total route distance with and without the new booking
  const oldDistance = routeTotalDistance(existingBookings)
  const fakeBooking: Booking = {
    id: '__new__',
    token: '__new__',
    date: existingBookings[0]?.date ?? '',
    slot: '',
    clientName: '',
    clientPhone: '',
    address: '',
    lat: newLat,
    lon: newLon,
    serviceId: '',
    status: 'confirmed',
  }
  const newDistance = routeTotalDistance([...existingBookings, fakeBooking])

  if (newDistance > oldDistance * (1 + DETOUR_MAX_RATIO)) {
    return { ok: false, reason: 'detour' }
  }

  return { ok: true }
}

export function isSlotAdjacent(slot: string, existingBookings: Booking[], allSlots: string[]): boolean {
  const takenIndices = existingBookings
    .map((b) => allSlots.indexOf(b.slot))
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
  const takenSlots = new Set(dayBookings.map((b) => b.slot))
  const joinResult = canJoinDay(dayBookings, lat, lon)

  return allSlots.map((slot) => {
    if (takenSlots.has(slot)) return { slot, status: 'taken' }
    if (!joinResult.ok) return { slot, status: 'blocked' }
    if (dayBookings.length > 0 && !isSlotAdjacent(slot, dayBookings, allSlots)) {
      return { slot, status: 'blocked' }
    }
    return { slot, status: 'available' }
  })
}
