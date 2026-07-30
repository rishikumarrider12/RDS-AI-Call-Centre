import pino from 'pino'
import { maskPII } from './mask'
import { logBuffer } from './logBuffer'

function maskField(field: string, value: unknown): unknown {
  if (typeof value !== 'string') return value
  return (maskPII({ [field]: value }) as Record<string, unknown>)[field]
}

function setupLogCapture() {
  const originalWrite = process.stdout.write.bind(process.stdout)
  process.stdout.write = function(chunk: any, ...args: any[]): boolean {
    const text = typeof chunk === 'string' ? chunk : chunk.toString()
    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) {
        try {
          const parsed = JSON.parse(trimmed)
          logBuffer.add(parsed)
        } catch {
          // skip non-JSON lines
        }
      }
    }
    return originalWrite(chunk, ...args)
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:dd-MM-yyyy HH:mm:ss',
            ignore: 'pid,hostname',
          },
        },
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

if (process.env.NODE_ENV === 'production') {
  setupLogCapture()
}
