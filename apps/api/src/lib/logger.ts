import pino from 'pino'
import { maskPII } from './mask'

function maskField(field: string, value: unknown): unknown {
  if (typeof value !== 'string') return value
  return (maskPII({ [field]: value }) as Record<string, unknown>)[field]
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  // Serializers mask known PII fields so sensitive data never lands in logs (5.3)
  serializers: {
    email: (v) => maskField('email', v),
    actorEmail: (v) => maskField('actorEmail', v),
    fullName: (v) => maskField('fullName', v),
    actorName: (v) => maskField('actorName', v),
    name: (v) => maskField('name', v),
    phone: (v) => maskField('phone', v),
    toNumber: (v) => maskField('toNumber', v),
    fromNumber: (v) => maskField('fromNumber', v),
    ipAddress: (v) => maskField('ipAddress', v),
    ip_address: (v) => maskField('ip_address', v),
    req: (v) => maskPII(v),
    body: (v) => maskPII(v),
  },
})
