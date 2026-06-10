import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function getAdminPassword(): Promise<string> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_password')
      .maybeSingle()
    return data?.value ?? process.env.ADMIN_SECRET ?? ''
  } catch {
    return process.env.ADMIN_SECRET ?? ''
  }
}
