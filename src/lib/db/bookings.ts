import { supabase } from '../supabase'
import type { Booking, Availability, BlockedDay } from '../types'

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
    slot: row.slot,
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

export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .neq('status', 'cancelled')
  if (error) throw error
  return (data as BookingRow[]).map(toBooking)
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
  if (error) throw error
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
