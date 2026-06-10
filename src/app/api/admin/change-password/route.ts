export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { isAdminAuthorized, csrfCheck } from '@/lib/adminAuth'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getAdminPassword } from '@/lib/db/settings'

export async function POST(request: Request) {
  const csrf = csrfCheck(request)
  if (csrf) return NextResponse.json({ error: csrf.error }, { status: csrf.status })

  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string }

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const stored = await getAdminPassword()
  if (currentPassword !== stored) {
    return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 })
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'admin_password', value: newPassword }, { onConflict: 'key' })

  if (error) {
    console.error('[change-password] upsert error:', error)
    return NextResponse.json({ error: 'Error al guardar la contraseña' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
