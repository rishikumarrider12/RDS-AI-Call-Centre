import crypto from 'crypto'

export function verifyWebhookSignature(
  payload: string,
  secret: string,
  signature: string,
  algorithm: string = 'sha256'
): boolean {
  try {
    const expected = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex')
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('base64url')}`
}

export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}
