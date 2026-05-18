import twilio from 'twilio'
import type { Booking, Service } from './types'

function client() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}

const FROM = () => process.env.TWILIO_WHATSAPP_FROM!

// Normaliza número argentino a formato whatsapp:+549XXXXXXXXXX
function toWA(phone: string): string {
  const digits = phone.replace(/[\s\-().+]/g, '')

  let e164: string
  if (digits.startsWith('549')) {
    e164 = `+${digits}`
  } else if (digits.startsWith('54')) {
    // +54 sin el 9 de celular → agregarlo
    e164 = `+549${digits.slice(2)}`
  } else if (digits.startsWith('0')) {
    // 011XXXXXXXX → sacar el 0, agregar +549
    e164 = `+549${digits.slice(1)}`
  } else if (digits.startsWith('15')) {
    // número local sin código de área — no tenemos suficiente info, usar como viene
    e164 = `+549${digits}`
  } else {
    e164 = `+549${digits}`
  }

  return `whatsapp:${e164}`
}

async function send(to: string, body: string): Promise<void> {
  await client().messages.create({ from: FROM(), to, body })
}

export async function sendBookingConfirmation(
  booking: Booking,
  service: Service
): Promise<void> {
  const link = `${process.env.NEXT_PUBLIC_URL}/turno/${booking.token}`
  const body =
    `¡Hola ${booking.clientName}! Tu turno está confirmado ✅\n\n` +
    `📅 Fecha: ${booking.date}\n` +
    `🕐 Hora: ${booking.slot}\n` +
    `✂️ Servicio: ${service.label}\n` +
    `📍 Dirección: ${booking.address}\n\n` +
    `El peluquero llegará puntual. Podés gestionar tu turno acá:\n${link}`

  try {
    await send(toWA(booking.clientPhone), body)
  } catch (err) {
    console.error('[whatsapp] sendBookingConfirmation:', err)
  }
}

export async function sendCancellationNotice(booking: Booking): Promise<void> {
  const body =
    `Hola ${booking.clientName}, tu turno del ${booking.date} a las ${booking.slot} fue cancelado. ` +
    `Si querés reservar uno nuevo podés hacerlo desde nuestra página. ¡Hasta pronto! 👋`

  try {
    await send(toWA(booking.clientPhone), body)
  } catch (err) {
    console.error('[whatsapp] sendCancellationNotice:', err)
  }
}

export async function notifyAdminCancellation(booking: Booking): Promise<void> {
  const to = process.env.PELUQUERO_PHONE!
  const body =
    `❌ Turno cancelado\n\n` +
    `Cliente: ${booking.clientName}\n` +
    `Tel: ${booking.clientPhone}\n` +
    `Slot liberado: ${booking.date} ${booking.slot}`

  try {
    await send(to, body)
  } catch (err) {
    console.error('[whatsapp] notifyAdminCancellation:', err)
  }
}
