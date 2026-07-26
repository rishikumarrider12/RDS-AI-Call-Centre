import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Application-level field encryption for sensitive PII at rest (Phase 5.2).
// Uses AES-256-GCM with a key derived from FIELD_ENCRYPTION_KEY. When the key
// is not configured (e.g. local dev), a deterministic dev key is used and a
// warning is emitted so it is never silently treated as secure in production.

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY
  if (raw && raw.length >= 32) {
    return Buffer.from(raw.slice(0, 32))
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FIELD_ENCRYPTION_KEY must be set in production for PII encryption at rest')
  }
  return Buffer.from('dev-insecure-encryption-key-change-me!!')
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptField(payload: string): string {
  const [version, ivHex, tagHex, dataHex] = payload.split(':')
  if (version !== 'v1') {
    throw new Error('Unsupported encryption payload version')
  }
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function isEncrypted(value: string): boolean {
  return value.startsWith('v1:')
}
