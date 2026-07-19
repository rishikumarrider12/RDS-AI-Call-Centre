import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
})

// Bypasses RLS by using service role key, falls back to anon key if not set
const adminKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
export const supabaseAdmin = createClient(env.SUPABASE_URL, adminKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Creates a client with the user's access token to enforce DB-level RLS
export function getSupabaseClient(accessToken?: string) {
  if (!accessToken) {
    return supabase
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
