import twilio from 'twilio'
import type { Booking } from './types'

function client() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}

const from = () => process.env.TWILIO_WHATSAPP_FROM!
const barber = () => process.env.PELUQUERO_PHONE!

export async function notifyBookingCreated(booking: Booking): Promise<void> {
  await client().messages.create({
    from: from(),
    to: barber(),
    body:
      `Nuevo turno 📅\n` +
      `Cliente: ${booking.clientName}\n` +
      `Tel: ${booking.clientPhone}\n` +
      `Fecha: ${booking.date} ${booking.slot}\n` +
      `Dirección: ${booking.address}`,
  })
}

export async function notifyBookingCancelled(booking: Booking): Promise<void> {
  await client().messages.create({
    from: from(),
    to: barber(),
    body:
      `Turno cancelado ❌\n` +
      `Cliente: ${booking.clientName}\n` +
      `Fecha: ${booking.date} ${booking.slot}`,
  })
}
