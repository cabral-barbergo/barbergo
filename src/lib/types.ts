export interface Booking {
  id: string
  token: string
  date: string
  slot: string
  clientName: string
  clientPhone: string
  address: string
  lat: number
  lon: number
  serviceId: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

export interface Service {
  id: string
  label: string
  duration: number
  price: number
  icon: string
}

export interface AvailabilitySlot {
  slot: string
  status: 'available'
}

export type Block = string[]

export interface DayAvailability {
  date: string
  isBlocked: boolean
  availableCount: number
}

export interface Availability {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export interface BlockedDay {
  id: string
  date: string
  reason: string | null
}
