import type { Booking, AvailabilitySlot, Block } from './types'

const EARTH_RADIUS_KM = 6371
const PROXIMITY_MAX_KM = 0.6

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
    const bIdx = blockSlots.indexOf(b.slot.substring(0, 5))
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

export function getAvailableSlotsForDay(
  allBookings: Booking[],
  date: string,
  lat: number,
  lon: number,
  activeSlots: string[],
  blockedSlots: string[]
): AvailabilitySlot[] {
  const dayBookings = allBookings.filter(
    (b) => b.date === date && b.status !== 'cancelled' && b.status != null
  )
  const takenSet = new Set(dayBookings.map((b) => b.slot.substring(0, 5)))
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
    const blockBookings = dayBookings.filter((b) => block.includes(b.slot.substring(0, 5)))
    for (const slot of block) {
      if (takenSet.has(slot) || blockedSet.has(slot)) continue
      const { ok } = canJoinBlock(block, blockBookings, slot, lat, lon)
      if (ok) result.push({ slot, status: 'available' })
    }
  }

  return result
}
