// PII masking utilities (Phase 5.3 — PII masking in logs)
// Used by the logger serializers and anywhere sensitive values are surfaced.

export function maskEmail(email?: string | null): string | null {
  if (!email) return email ?? null
  const at = email.indexOf('@')
  if (at <= 0) return '***'
  const local = email.slice(0, at)
  const domain = email.slice(at)
  if (local.length <= 2) return `***${domain}`
  return `${local.slice(0, 1)}***${local.slice(-1)}${domain}`
}

export function maskPhone(phone?: string | null): string | null {
  if (!phone) return phone ?? null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  return `***${digits.slice(-4)}`
}

export function maskName(name?: string | null): string | null {
  if (!name) return name ?? null
  const trimmed = name.trim()
  if (trimmed.length <= 1) return '***'
  return `${trimmed.slice(0, 1)}${'*'.repeat(Math.min(trimmed.length - 1, 8))}`
}

export function maskIp(ip?: string | null): string | null {
  if (!ip) return ip ?? null
  if (ip.includes(':')) return '****:****:****:****'
  const parts = ip.split('.')
  if (parts.length !== 4) return '*.**.***.***'
  return `${parts[0]}.*.***.***`
}

const PII_KEYS: Record<string, (v: string) => string | null> = {
  email: maskEmail as (v: string) => string | null,
  actorEmail: maskEmail as (v: string) => string | null,
  fullName: maskName as (v: string) => string | null,
  actorName: maskName as (v: string) => string | null,
  name: maskName as (v: string) => string | null,
  phone: maskPhone as (v: string) => string | null,
  toNumber: maskPhone as (v: string) => string | null,
  fromNumber: maskPhone as (v: string) => string | null,
  ipAddress: maskIp as (v: string) => string | null,
  ip_address: maskIp as (v: string) => string | null,
}

// Recursively masks known PII keys in a plain object. Non-serializable
// values are left untouched.
export function maskPII(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    return value.map((item) => maskPII(item, seen))
  }
  if (typeof value === 'object') {
    if (seen.has(value as object)) return '[Circular]'
    seen.add(value as object)
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const masker = PII_KEYS[key]
      if (masker && typeof val === 'string') {
        out[key] = masker(val)
      } else {
        out[key] = maskPII(val, seen)
      }
    }
    return out
  }
  return value
}
