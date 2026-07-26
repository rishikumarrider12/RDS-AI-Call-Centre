import { Request, Response, NextFunction } from 'express'
import { supabaseAuth } from '../lib/auth'
import { getSupabaseClient } from '../lib/supabase'
import { logger } from '../lib/logger'

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.cookies?.rds_access_token
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { data, error } = await supabaseAuth.auth.getUser(accessToken)

    if (error || !data.user) {
      res.clearCookie('rds_access_token', { path: '/' })
      res.clearCookie('rds_refresh_token', { path: '/' })
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const userMetadata = data.user.user_metadata as Record<string, unknown> | null
    const appMetadata = data.user.app_metadata as Record<string, unknown> | null

    const roles = Array.isArray(userMetadata?.roles)
      ? userMetadata.roles.filter((r): r is string => typeof r === 'string')
      : typeof userMetadata?.role === 'string'
        ? [userMetadata.role]
        : Array.isArray(appMetadata?.roles)
          ? appMetadata.roles.filter((r): r is string => typeof r === 'string')
          : []

    // Fetch the user's db details including organization_id
    // using the request's token to comply with RLS
    let organizationId: string | null = null
    try {
      const userClient = getSupabaseClient(accessToken)
      const { data: dbUser, error: dbUserError } = await userClient
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()

      if (dbUserError) {
        logger.warn({ error: dbUserError.message }, 'failed to fetch user org_id in auth middleware')
      } else if (dbUser) {
        organizationId = dbUser.organization_id
      }
    } catch (dbErr) {
      logger.error({ error: dbErr instanceof Error ? dbErr.message : 'Unknown error' }, 'failed to fetch user org_id in auth middleware')
    }

    req.user = {
      id: data.user.id,
      email: data.user.email!,
      fullName: (userMetadata?.full_name as string) || data.user.email!,
      roles,
      organizationId,
    }
    next()
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'auth middleware error')
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

export function requireAnyRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.roles.some(r => allowedRoles.includes(r))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        fullName: string
        roles: string[]
        organizationId: string | null
      }
    }
  }
}
