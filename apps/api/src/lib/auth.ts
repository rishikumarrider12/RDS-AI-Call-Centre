import { createClient } from '@supabase/supabase-js'
import { env } from '../lib/env'

export const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut()
  if (error) throw error
}

export async function refreshSession(refreshToken: string) {
  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: refreshToken,
  })
  if (error) throw error
  return data
}

export async function forgotPassword(email: string) {
  const { data, error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.APP_URL}/auth/reset-password`,
  })
  if (error) throw error
  return data
}

export async function resetPassword(token: string, newPassword: string) {
  const { error } = await supabaseAuth.auth.verifyOtp({
    token_hash: token,
    type: 'recovery',
  })
  if (error) throw error

  const { error: updateError } = await supabaseAuth.auth.updateUser({
    password: newPassword,
  })
  if (updateError) throw updateError
}

export async function verifyEmail(token: string) {
  const { data, error } = await supabaseAuth.auth.verifyOtp({
    token_hash: token,
    type: 'signup',
  })
  if (error) throw error
  return data
}

export async function getUser(userId: string) {
  const { data, error } = await supabaseAuth.auth.admin.getUserById(userId)
  if (error) throw error
  return data
}
