import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { env } from './lib/env'
import { logger } from './lib/logger'
import healthRouter from './routes/health'
import authRouter from './routes/auth'
import { errorHandler } from './middleware/error'

const app = express()

const corsOrigin = env.CORS_ORIGIN.split(',').map(s => s.trim())

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}))
app.use(express.json())
app.use(cookieParser())
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'incoming request')
  next()
})

app.use('/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api', healthRouter)

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API server listening')
})

export default app
