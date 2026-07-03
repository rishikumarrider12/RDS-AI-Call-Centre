import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './lib/env'
import { logger } from './lib/logger'
import healthRouter from './routes/health'
import { errorHandler } from './middleware/error'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }))
app.use(express.json())
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
app.use('/api', healthRouter)

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API server listening')
})

export default app
