'use client'

import { useState, useEffect, useCallback } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface User {
  id: string
  email: string
  full_name: string
  roles: string[]
  organization_id?: string | null
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        return
      }

      if (res.status === 401) {
        const refreshed = await refreshSession()
        if (refreshed) {
          const retryRes = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include',
            cache: 'no-store',
          })
          if (retryRes.ok) {
            const data = await retryRes.json()
            setUser(data.user)
            return
          }
        }
      }

      setUser(null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [refreshSession])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        await fetchUser()
        return true
      }
      setUser(null)
      return false
    } catch {
      setUser(null)
      return false
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchUser])

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { user, loading, isRefreshing, refresh, logout }
}
