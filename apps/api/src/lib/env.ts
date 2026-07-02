import { z } from 'zod'

export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z.string().default('info'),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
  })
  .parse(process.env)
