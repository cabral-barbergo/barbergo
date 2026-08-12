// notify v3
import twilio from 'twilio'
import type { Booking } from './types'

function twilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('[notify] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set')
  return twilio(sid, token)
}

function withWAPrefix(val: string): string {
  return val.startsWith('whatsapp:') ? val : `whatsapp:${val}`
}

function fromNumber(): string {
  const f = process.env.TWILIO_WHATSAPP_FROM
  if (!f) throw new Error('[notify] TWILIO_WHATSAPP_FROM not set')
  return withWAPrefix(f)
}

function barberNumber(): string {
  const b = process.env.PELUQUERO_PHONE
  if (!b) throw new Error('[notify] PELUQUERO_PHONE not set')
  return withWAPrefix(b)
}

// Normaliza número argentino → whatsapp:+549XXXXXXXXXX
function toWA(phone: string): string {
  const digits = phone.replace(/[\s\-().+]/g, '')
  let e164: string
  if      (digits.startsWith('549')) e164 = `+${digits}`
  else if (digits.startsWith('54'))  e164 = `+549${digits.slice(2)}`
  else if (digits.startsWith('0'))   e164 = `+549${digits.slice(1)}`
  else                               e164 = `+549${digits}`
  return `whatsapp:${e164}`
}

async function send(to: string, body: string): Promise<void> {
  const from = fromNumber()
  console.log(`[notify] sending to=${to} from=${from}`)
  const msg = await twilioClient().messages.create({ from, to, body })
  console.log(`[notify] message sent sid=${msg.sid} to=${to} status=${msg.status}`)
}

async function sendTemplate(
  to: string,
  contentSid: string,
  contentVariables: Record<string, string>
): Promise<void> {
  const from = fromNumber()
  console.log(`[notify] sending template contentSid=${contentSid} to=${to} from=${from}`)
  const msg = await twilioClient().messages.create({
    from,
    to,
    contentSid,
    contentVariables: JSON.stringify(contentVariables),
  })
  console.log(`[notify] template sent sid=${msg.sid} to=${to} status=${msg.status}`)
}

function logResults(label: string, tos: string[], results: PromiseSettledResult<void>[]): void {
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[notify] ${label} message[${i}] to=${tos[i]} failed:`, JSON.stringify(r.reason))
    } else {
      console.log(`[notify] ${label} message[${i}] to=${tos[i]} sent ok`)
    }
  })
}


export async function notifyBookingCreated(booking: Booking): Promise<void> {
  console.log('[notify] START clientPhone:', JSON.stringify(booking.clientPhone), 'len:', booking.clientPhone?.length ?? 'undefined')
  console.log('[notify] PELUQUERO_PHONE:', process.env.PELUQUERO_PHONE ? 'set' : 'NOT SET')
  const CLIENT_CONFIRMATION_SID = 'HXd24a0841ff8d8e2416774a4a970ca107'
  const formattedDate = booking.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')

  const clientTo = toWA(booking.clientPhone)
  let barberTo: string
  try {
    barberTo = barberNumber()
  } catch (err) {
    console.error('[notify] notifyBookingCreated — barber config missing:', err)
    barberTo = ''
  }

  console.log('[notify] clientTo (after toWA):', clientTo)
  console.log(`[notify] notifyBookingCreated client=${clientTo} barber=${barberTo}`)

  const templateVars = {
    '1': booking.clientName,
    '2': formattedDate,
    '3': booking.slot,
    '4': booking.address,
    '5': booking.token,
  }

  const tos   = barberTo ? [clientTo, barberTo] : [clientTo]
  const tasks = barberTo
    ? [
        sendTemplate(clientTo, CLIENT_CONFIRMATION_SID, templateVars),
        sendTemplate(barberTo, CLIENT_CONFIRMATION_SID, templateVars),
      ]
    : [
        sendTemplate(clientTo, CLIENT_CONFIRMATION_SID, templateVars),
      ]

  logResults('notifyBookingCreated', tos, await Promise.allSettled(tasks))
}

export async function notifyBookingRescheduled(
  booking: Booking,
  newDate: string,
  newSlot: string
): Promise<void> {
  const clientMsg =
    `Hola ${booking.clientName}, tu turno fue reprogramado para el ${newDate} a las ${newSlot}. ¡Te esperamos! - Seba Cabral`

  const barberMsg =
    `Turno reprogramado 📅\nCliente: ${booking.clientName}\nNueva fecha: ${newDate} ${newSlot}`

  const clientTo = toWA(booking.clientPhone)
  let barberTo: string
  try {
    barberTo = barberNumber()
  } catch (err) {
    console.error('[notify] notifyBookingRescheduled — barber config missing:', err)
    barberTo = ''
  }

  const tos   = barberTo ? [clientTo, barberTo] : [clientTo]
  const tasks = barberTo
    ? [send(clientTo, clientMsg), send(barberTo, barberMsg)]
    : [send(clientTo, clientMsg)]

  logResults('notifyBookingRescheduled', tos, await Promise.allSettled(tasks))
}

export async function notifyBookingCancelled(booking: Booking): Promise<void> {
  const clientMsg =
    `Hola ${booking.clientName}, tu turno del ${booking.date} a las ${booking.slot} fue cancelado. ` +
    `Si querés reservar uno nuevo podés hacerlo desde nuestra página. ¡Hasta pronto! 👋`

  const barberMsg =
    `Turno cancelado ❌\n` +
    `Cliente: ${booking.clientName}\n` +
    `Fecha: ${booking.date} ${booking.slot}`

  const clientTo = toWA(booking.clientPhone)
  let barberTo: string
  try {
    barberTo = barberNumber()
  } catch (err) {
    console.error('[notify] notifyBookingCancelled — barber config missing:', err)
    barberTo = ''
  }

  const tos   = barberTo ? [clientTo, barberTo] : [clientTo]
  const tasks = barberTo
    ? [send(clientTo, clientMsg), send(barberTo, barberMsg)]
    : [send(clientTo, clientMsg)]

  logResults('notifyBookingCancelled', tos, await Promise.allSettled(tasks))
}
