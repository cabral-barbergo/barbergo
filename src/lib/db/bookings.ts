import { supabaseAdmin as supabase } from '../supabase'
import type { Booking, Availability, BlockedDay, ServiceZone } from '../types'

export class SlotConflictError extends Error {
  constructor() {
    super('Este horario ya no está disponible')
    this.name = 'SlotConflictError'
  }
}

// Row types as returned by Supabase (snake_case)
type BookingRow = {
  id: string
  token: string
  date: string
  slot: string
  client_name: string
  client_phone: string
  address: string
  lat: number
  lon: number
  service_id: string
  status: string
  created_at: string
}

type AvailabilityRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}


function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    token: row.token,
    date: row.date,
    slot: (row.slot || '').toString().substring(0, 5),
    clientName: row.client_name,
    clientPhone: row.client_phone,
    address: row.address,
    lat: row.lat,
    lon: row.lon,
    serviceId: row.service_id,
    status: row.status as Booking['status'],
  }
}

function toAvailability(row: AvailabilityRow): Availability {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
  }
}

export async function isSlotTaken(date: string, slot: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('date', date)
    .eq('slot', slot)
    .neq('status', 'cancelled')
  if (error) throw error
  return (count ?? 0) > 0
}

export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .not('status', 'is', null)
    .neq('status', 'cancelled')
  if (error) throw error
  const rows = data as BookingRow[]
  console.log(
    `[getBookingsByDate] date=${date} rows=${rows.length}`,
    rows.map((r) => ({ date: r.date, slotRaw: r.slot, slotNorm: (r.slot || '').toString().substring(0, 5), status: r.status }))
  )
  return rows.map(toBooking)
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return toBooking(data as BookingRow)
}

export async function updateBookingById(
  id: string,
  updates: { clientName?: string; address?: string; lat?: number; lon?: number }
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}
  if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName
  if (updates.address   !== undefined) dbUpdates.address      = updates.address
  if (updates.lat       !== undefined) dbUpdates.lat          = updates.lat
  if (updates.lon       !== undefined) dbUpdates.lon          = updates.lon
  const { error } = await supabase.from('bookings').update(dbUpdates).eq('id', id)
  if (error) throw error
}

export async function cancelBookingById(id: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
  if (error) throw error
}

export async function getBookingByToken(token: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('token', token)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return toBooking(data as BookingRow)
}

export async function createBooking(
  data: Omit<Booking, 'id' | 'token' | 'status'>
): Promise<Booking> {
  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      date: data.date,
      slot: data.slot,
      client_name: data.clientName,
      client_phone: data.clientPhone,
      address: data.address,
      lat: data.lat,
      lon: data.lon,
      service_id: data.serviceId,
    })
    .select()
    .single()
  if (error) {
    // 23505 = unique_violation — DB-level guarantee catches races the app check misses
    if (error.code === '23505') throw new SlotConflictError()
    throw error
  }
  return toBooking(row as BookingRow)
}

export async function cancelBooking(token: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('token', token)
  if (error) throw error
}

export async function getAvailability(): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('is_active', true)
    .order('day_of_week')
  if (error) throw error
  return (data as AvailabilityRow[]).map(toAvailability)
}

export async function getBlockedDays(): Promise<BlockedDay[]> {
  const { data, error } = await supabase
    .from('blocked_days')
    .select('*')
    .order('date')
  if (error) throw error
  return data as BlockedDay[]
}

export async function blockDay(date: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_days')
    .insert({ date, reason })
  if (error) throw error
}

export async function unblockDay(date: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_days')
    .delete()
    .eq('date', date)
  if (error) throw error
}

// ── availability_slots (new schema v2) ────────────────────────

export async function getActiveSlots(dayOfWeek: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('availability_slots')
    .select('slot')
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .order('slot')
  if (error) throw error
  return (data as { slot: string }[]).map((r) => (r.slot || '').toString().substring(0, 5))
}

export async function getAllSlotsForDay(dayOfWeek: number): Promise<{ slot: string; isActive: boolean }[]> {
  const { data, error } = await supabase
    .from('availability_slots')
    .select('slot, is_active')
    .eq('day_of_week', dayOfWeek)
    .order('slot')
  if (error) throw error
  return (data as { slot: string; is_active: boolean }[]).map((r) => ({
    slot: (r.slot || '').toString().substring(0, 5),
    isActive: r.is_active,
  }))
}

export async function toggleAvailabilitySlot(
  dayOfWeek: number,
  slot: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('availability_slots')
    .update({ is_active: isActive })
    .eq('day_of_week', dayOfWeek)
    .eq('slot', slot)
  if (error) throw error
}

export async function applySlotRange(
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<void> {
  const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const startMins = toMins(startTime)
  const endMins   = toMins(endTime)

  const activeSlots: string[] = []
  for (let mins = startMins; mins < endMins; mins += 30) {
    const h = String(Math.floor(mins / 60)).padStart(2, '0')
    const m = String(mins % 60).padStart(2, '0')
    activeSlots.push(`${h}:${m}`)
  }

  const { error: deactivateErr } = await supabase
    .from('availability_slots')
    .update({ is_active: false })
    .eq('day_of_week', dayOfWeek)
  if (deactivateErr) throw deactivateErr

  if (activeSlots.length === 0) return

  const { error: upsertErr } = await supabase
    .from('availability_slots')
    .upsert(
      activeSlots.map((slot) => ({ day_of_week: dayOfWeek, slot, is_active: true, slot_duration_minutes: 30 })),
      { onConflict: 'day_of_week,slot' }
    )
  if (upsertErr) throw upsertErr
}

// ── blocked_slots (new schema v2) ────────────────────────────

export async function getBlockedSlots(date: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('blocked_slots')
    .select('slot')
    .eq('date', date)
  if (error) throw error
  return (data as { slot: string }[]).map((r) => (r.slot || '').toString().substring(0, 5))
}

export async function blockSlot(date: string, slot: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_slots')
    .insert({ date, slot, reason: reason ?? null })
  if (error) throw error
}

export async function unblockSlot(date: string, slot: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_slots')
    .delete()
    .eq('date', date)
    .eq('slot', slot)
  if (error) throw error
}

// ── service_zone (schema v3) ─────────────────────────────────────

type ServiceZoneRow = {
  id: string
  name: string
  center_lat: number
  center_lon: number
  polygon: [number, number][]
  updated_at: string
}

export async function getServiceZone(): Promise<ServiceZone> {
  const { data, error } = await supabase
    .from('service_zone')
    .select('*')
    .eq('name', 'main')
    .single()
  if (error) throw error
  const row = data as ServiceZoneRow
  return {
    id: row.id,
    name: row.name,
    centerLat: row.center_lat,
    centerLon: row.center_lon,
    polygon: row.polygon,
  }
}

export async function updateServiceZone(
  center: [number, number],
  polygon: [number, number][]
): Promise<void> {
  const { error } = await supabase
    .from('service_zone')
    .update({ center_lat: center[0], center_lon: center[1], polygon, updated_at: new Date().toISOString() })
    .eq('name', 'main')
  if (error) throw error
}
