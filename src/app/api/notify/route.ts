import { NextResponse } from 'next/server'
import {
  sendBookingConfirmation,
  sendCancellationNotice,
  notifyAdminCancellation,
} from '@/lib/whatsapp'
import type { Booking, Service } from '@/lib/types'

type NotifyPayload =
  | { type: 'booking_confirmation'; booking: Booking; service: Service }
  | { type: 'cancellation_notice'; booking: Booking }
  | { type: 'admin_cancellation'; booking: Booking }

export async function POST(request: Request) {
  let body: NotifyPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body?.type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 })
  }

  switch (body.type) {
    case 'booking_confirmation':
      if (!body.booking || !body.service) {
        return NextResponse.json(
          { error: 'booking and service are required for booking_confirmation' },
          { status: 400 }
        )
      }
      await sendBookingConfirmation(body.booking, body.service)
      break

    case 'cancellation_notice':
      if (!body.booking) {
        return NextResponse.json(
          { error: 'booking is required for cancellation_notice' },
          { status: 400 }
        )
      }
      await sendCancellationNotice(body.booking)
      break

    case 'admin_cancellation':
      if (!body.booking) {
        return NextResponse.json(
          { error: 'booking is required for admin_cancellation' },
          { status: 400 }
        )
      }
      await notifyAdminCancellation(body.booking)
      break

    default:
      return NextResponse.json(
        { error: `Unknown notification type: ${(body as { type: string }).type}` },
        { status: 400 }
      )
  }

  return NextResponse.json({ ok: true })
}
