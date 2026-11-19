// Argentine mobile number normalization for WhatsApp (E.164: +549 + 10 digits).
//
// Clients type numbers in many shapes:
//   2324123456            (area code + number)
//   02324 15 123456       (leading 0 + "15" mobile prefix)
//   2324 15 123456        ("15" prefix, no leading 0)
//   +54 9 2324 123456     (already international)
//   54 2324 15 123456     (international without the 9, with "15")
//   15123456              (local only, no area code)
//
// Twilio rejects malformed numbers at API-call time (error 21211), which leaves
// no message record behind — so we normalize before sending.

const DEFAULT_AREA_CODE = '2324' // Mercedes, Buenos Aires

// Removes the "15" mobile prefix that sits right after the area code (2–4 digits).
// Only acts when the result is a valid 10-digit national number.
function stripMobilePrefix(national: string): string {
  if (national.length !== 12) return national
  for (const areaLen of [2, 3, 4]) {
    if (national.slice(areaLen, areaLen + 2) === '15') {
      return national.slice(0, areaLen) + national.slice(areaLen + 2)
    }
  }
  return national
}

export function normalizeArPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')

  // Drop country code (+54, optionally followed by the mobile 9)
  if (digits.startsWith('549')) digits = digits.slice(3)
  else if (digits.startsWith('54')) digits = digits.slice(2)

  // Drop trunk prefix 0
  if (digits.startsWith('0')) digits = digits.slice(1)

  // Local-only mobile: "15" + 6-digit subscriber, no area code
  if (digits.length === 8 && digits.startsWith('15')) {
    digits = DEFAULT_AREA_CODE + digits.slice(2)
  }

  digits = stripMobilePrefix(digits)

  return `+549${digits}`
}

export function toWhatsApp(phone: string): string {
  return `whatsapp:${normalizeArPhone(phone)}`
}

// A valid Argentine mobile in E.164 is +549 followed by 10 digits.
export function isValidArMobile(e164: string): boolean {
  return /^\+549\d{10}$/.test(e164)
}
