'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export default function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) {
      setLoading(true)
      fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      })
        .then(res => {
          if (!res.ok) {
            return res.json().then(data => { throw new Error(data.error || 'Verification failed') })
          }
          return res.json()
        })
        .then(() => setSuccess(true))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [token])

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Email verification</h1>
          <p className="mt-2 text-muted-foreground">
            The verification link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Verify your email</h1>
      </div>

      {loading && (
        <p className="text-center text-muted-foreground">Verifying...</p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            Your email has been verified successfully.{' '}
            <a href="/auth/login" className="underline">
              Sign in
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
