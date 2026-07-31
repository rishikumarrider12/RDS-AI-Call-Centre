import { z } from 'zod'

export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    APP_URL: z.string().default('http://localhost:3000'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z.string().default('info'),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    COOKIE_SECURE: z.string().optional(),
    COOKIE_SAMESITE: z.string().optional(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    TRUST_PROXY: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM_NUMBER: z.string().optional(),
  })
  .parse(process.env)

export const isCookieSecure = env.COOKIE_SECURE === 'true' || env.NODE_ENV === 'production'
export const cookieSameSite: 'strict' | 'lax' | 'none' = env.COOKIE_SAMESITE === 'strict' ? 'strict' : 'lax'
export const trustProxy = env.TRUST_PROXY === 'true'

export const twilioConfig = {
  accountSid: env.TWILIO_ACCOUNT_SID,
  authToken: env.TWILIO_AUTH_TOKEN,
  fromNumber: env.TWILIO_FROM_NUMBER,
}

export function hasTwilioConfig(): boolean {
  return !!(twilioConfig.accountSid && twilioConfig.authToken && twilioConfig.fromNumber)
}

if (env.NODE_ENV === 'production') {
  const missing: string[] = []

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    missing.push('JWT_SECRET (must be >= 32 characters)')
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`)
  }
}
