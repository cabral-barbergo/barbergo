import type { Booking, AvailabilitySlot, Block, ServiceZone } from './types'

const EARTH_RADIUS_KM = 6371
const PROXIMITY_MAX_KM = 0.7

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
  const route = optimizeRoute(bookings).filter((b) => b.lat !== 0 || b.lon !== 0)
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += haversine(route[i - 1].lat, route[i - 1].lon, route[i].lat, route[i].lon)
  }
  return total
}

function slotToMins(slot: string): number {
  const [h, m] = slot.split(':').map(Number)
  return h * 60 + m
}

export function groupSlotsIntoBlocks(slots: string[]): Block[] {
  if (slots.length === 0) return []
  const sorted = [...slots].sort((a, b) => slotToMins(a) - slotToMins(b))
  const blocks: Block[] = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    if (slotToMins(sorted[i]) - slotToMins(sorted[i - 1]) === 30) {
      blocks[blocks.length - 1].push(sorted[i])
    } else {
      blocks.push([sorted[i]])
    }
  }
  return blocks
}

export function findBlockForSlot(slot: string, blocks: Block[]): Block | null {
  return blocks.find((b) => b.includes(slot)) ?? null
}

export function canJoinBlock(
  blockSlots: Block,
  blockBookings: Booking[],
  newSlot: string,
  newLat: number,
  newLon: number
): { ok: boolean; reason?: 'not_adjacent' | 'distance' } {
  console.log('[canJoinBlock] blockBookings:', blockBookings.length, 'newSlot:', newSlot)

  if (blockBookings.length === 0) {
    const result = { ok: true }
    console.log('[canJoinBlock] result:', result)
    return result
  }

  const newSlotIdx = blockSlots.indexOf(newSlot)
  if (newSlotIdx === -1) {
    const result = { ok: false, reason: 'not_adjacent' as const }
    console.log('[canJoinBlock] result:', result)
    return result
  }

  const adjacentBookings = blockBookings.filter((b) => {
    const bIdx = blockSlots.indexOf((b.slot || '').toString().substring(0, 5))
    return bIdx === newSlotIdx - 1 || bIdx === newSlotIdx + 1
  })

  if (adjacentBookings.length === 0) {
    const result = { ok: false, reason: 'not_adjacent' as const }
    console.log('[canJoinBlock] result:', result)
    return result
  }

  const withinRange = adjacentBookings.some(
    (b) => haversine(newLat, newLon, b.lat, b.lon) <= PROXIMITY_MAX_KM
  )
  const result = withinRange ? { ok: true } : { ok: false, reason: 'distance' as const }
  console.log('[canJoinBlock] result:', result)
  return result
}

// ── Service zone geometry ────────────────────────────────────────

export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function lineSegmentIntersection(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number]
): [number, number] | null {
  const [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3, [x4, y4] = p4
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-10) return null
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
  }
  return null
}

export function projectToPolygonBorder(
  point: [number, number],
  center: [number, number],
  polygon: [number, number][]
): [number, number] {
  if (isPointInPolygon(point, polygon)) return point

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const intersection = lineSegmentIntersection(point, center, polygon[j], polygon[i])
    if (intersection) return intersection
  }

  // Fallback: closest polygon vertex
  let closest = polygon[0]
  let minDist = Infinity
  for (const vertex of polygon) {
    const d = Math.hypot(vertex[0] - point[0], vertex[1] - point[1])
    if (d < minDist) { minDist = d; closest = vertex }
  }
  return closest
}

export function getEffectiveLocation(
  lat: number,
  lon: number,
  zone: Pick<ServiceZone, 'centerLat' | 'centerLon' | 'polygon'>
): { lat: number; lon: number; isIsolated: boolean } {
  const point: [number, number] = [lat, lon]
  const center: [number, number] = [zone.centerLat, zone.centerLon]
  const projected = projectToPolygonBorder(point, center, zone.polygon)
  const isIsolated = projected[0] !== lat || projected[1] !== lon
  return { lat: projected[0], lon: projected[1], isIsolated }
}

export function getAvailableSlotsForDay(
  allBookings: Booking[],
  date: string,
  lat: number,
  lon: number,
  activeSlots: string[],
  blockedSlots: string[],
  zone: Pick<ServiceZone, 'centerLat' | 'centerLon' | 'polygon'>
): AvailabilitySlot[] {
  const dayBookings = allBookings.filter(
    (b) => b.date === date && b.status !== 'cancelled' && b.status != null
  )
  const takenSet = new Set(dayBookings.map((b) => (b.slot || '').toString().substring(0, 5)))
  const blockedSet = new Set(blockedSlots.map((s) => s.substring(0, 5)))

  // No bookings → no proximity constraint; return all free slots immediately
  if (dayBookings.length === 0) {
    const freeSlots = activeSlots.filter((s) => !blockedSet.has(s))
    return freeSlots.map((slot) => ({ slot, status: 'available' as const }))
  }

  // Group using full activeSlots so taken slots remain in their blocks,
  // keeping block boundaries and adjacency detection intact.
  const blocks = groupSlotsIntoBlocks(activeSlots)

  const result: AvailabilitySlot[] = []
  for (const block of blocks) {
    const blockBookings = dayBookings.filter((b) => block.includes((b.slot || '').toString().substring(0, 5)))
    // Project existing bookings' coords so rural clients compare from their polygon border
    const projectedBlockBookings = blockBookings
      .filter((b) => b.lat !== 0 || b.lon !== 0)
      .map((b) => {
        const eff = getEffectiveLocation(b.lat, b.lon, zone)
        return { ...b, lat: eff.lat, lon: eff.lon }
      })
    for (const slot of block) {
      if (takenSet.has(slot) || blockedSet.has(slot)) continue
      const { ok } = canJoinBlock(block, projectedBlockBookings, slot, lat, lon)
      if (ok) result.push({ slot, status: 'available' })
    }
  }

  return result
}
