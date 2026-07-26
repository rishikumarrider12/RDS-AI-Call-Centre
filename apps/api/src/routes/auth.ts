import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { signUp, signIn, signOut, forgotPassword, resetPassword, verifyEmail, refreshSession } from '../lib/auth'
import { authenticate } from '../middleware/auth'
import { isCookieSecure, cookieSameSite } from '../lib/env'
import { logger } from '../lib/logger'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember_me: z.boolean().optional(),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

function setAuthCookies(
  res: Response,
  accessToken: string | undefined,
  refreshToken: string | undefined,
  options?: { accessTokenMaxAge?: number; refreshTokenMaxAge?: number }
) {
  const cookieBase = {
    httpOnly: true,
    secure: isCookieSecure,
    sameSite: cookieSameSite,
    path: '/',
  }

  if (accessToken) {
    res.cookie('rds_access_token', accessToken, {
      ...cookieBase,
      maxAge: options?.accessTokenMaxAge ?? 60 * 60 * 1000,
    })
  }

  if (refreshToken) {
    res.cookie('rds_refresh_token', refreshToken, {
      ...cookieBase,
      maxAge: options?.refreshTokenMaxAge ?? 7 * 24 * 60 * 60 * 1000,
    })
  }
}

function clearAuthCookies(res: Response) {
  res.clearCookie('rds_access_token', { path: '/' })
  res.clearCookie('rds_refresh_token', { path: '/' })
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body)
    const result = await signUp(input.email, input.password, input.full_name)
    logger.info({ email: input.email }, 'user registered')

    const accessToken = result.session?.access_token
    const refreshToken = result.session?.refresh_token
    setAuthCookies(res, accessToken, refreshToken)

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'registration failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body)
    const result = await signIn(input.email, input.password)
    logger.info({ email: input.email }, 'user logged in')

    const accessToken = result.session?.access_token
    const refreshToken = result.session?.refresh_token
    const rememberMe = input.remember_me || false
    const accessTokenMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000
    const refreshTokenMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000

    setAuthCookies(res, accessToken, refreshToken, { accessTokenMaxAge, refreshTokenMaxAge })

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.warn({ email: req.body.email }, 'login failed')
    res.status(401).json({ error: err instanceof Error ? err.message : 'Login failed' })
  }
})

router.post('/logout', async (req: Request, res: Response) => {
  try {
    await signOut()
  } catch (err) {
    logger.warn({ error: err instanceof Error ? err.message : 'Unknown error' }, 'signOut failed, clearing cookies anyway')
  }
  clearAuthCookies(res)
  logger.info('user logged out')
  res.status(200).json({ message: 'Logout successful' })
})

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const input = forgotPasswordSchema.parse(req.body)
    await forgotPassword(input.email)
    res.status(200).json({ message: 'Password reset email sent' })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to send reset email' })
  }
})

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const input = resetPasswordSchema.parse(req.body)
    await resetPassword(input.token, input.password)
    logger.info('password reset successful')
    res.status(200).json({ message: 'Password reset successful' })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Password reset failed' })
  }
})

router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const input = verifyEmailSchema.parse(req.body)
    const result = await verifyEmail(input.token)
    logger.info({ userId: result.user?.id }, 'email verified')
    res.status(200).json({
      message: 'Email verified successfully',
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Email verification failed' })
  }
})

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      full_name: req.user!.fullName,
      roles: req.user!.roles,
      organization_id: req.user!.organizationId,
    },
  })
})

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.rds_refresh_token
    if (!refreshToken) {
      return res.status(401).json({ error: 'Missing refresh token' })
    }

    const result = await refreshSession(refreshToken)
    const accessToken = result.session?.access_token
    const newRefreshToken = result.session?.refresh_token

    if (!accessToken) {
      clearAuthCookies(res)
      return res.status(401).json({ error: 'Failed to refresh session' })
    }

    setAuthCookies(res, accessToken, newRefreshToken || refreshToken)
    res.status(200).json({
      message: 'Session refreshed',
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
    })
  } catch (err) {
    clearAuthCookies(res)
    res.status(401).json({ error: err instanceof Error ? err.message : 'Session refresh failed' })
  }
})

export default router
