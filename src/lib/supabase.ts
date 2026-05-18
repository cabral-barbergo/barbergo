import { createClient, SupabaseClient } from '@supabase/supabase-js'

function createLazyClient(getKey: () => string, label: string): SupabaseClient {
  let _client: SupabaseClient | null = null

  function getClient(): SupabaseClient {
    if (!_client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = getKey()
      if (!url || !key) {
        throw new Error(`NEXT_PUBLIC_SUPABASE_URL and ${label} are required`)
      }
      _client = createClient(url, key)
    }
    return _client
  }

  return new Proxy({} as SupabaseClient, {
    get(_t, prop: string | symbol) {
      const c = getClient()
      const v = (c as unknown as Record<string | symbol, unknown>)[prop]
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(c) : v
    },
  })
}

// Public client — only for non-sensitive reads if ever needed client-side
export const supabaseAnon: SupabaseClient = createLazyClient(
  () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
)

// Admin client — bypasses RLS; use only in server-side code (API routes, server actions)
export const supabaseAdmin: SupabaseClient = createLazyClient(
  () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  'SUPABASE_SERVICE_ROLE_KEY'
)
