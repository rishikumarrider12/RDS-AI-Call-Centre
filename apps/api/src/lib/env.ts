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
  })
  .parse(process.env)

export const isCookieSecure = env.COOKIE_SECURE === 'true' || env.NODE_ENV === 'production'
export const cookieSameSite: 'strict' | 'lax' | 'none' = env.COOKIE_SAMESITE === 'strict' ? 'strict' : 'lax'

if (env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters in production')
  }
}
