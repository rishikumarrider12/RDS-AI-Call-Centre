import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { UserService } from '../services/user.service'
import { logger } from '../lib/logger'

const router = Router()
const userService = new UserService()

const userRoleEnum = z.enum(['super_admin', 'org_admin', 'agent', 'viewer'])

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2, 'Full name is required'),
  role: userRoleEnum,
})

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  status: z.enum(['active', 'invited', 'suspended']).optional(),
  role: userRoleEnum.optional(),
})

function requireOrgAccess(req: Request, organizationId: string): boolean {
  if (!req.user) return false
  if (req.user.roles.includes('super_admin')) return true
  return req.user.organizationId === organizationId
}

// List users (search + pagination)
router.get('/:id/users', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id
    if (!requireOrgAccess(req, organizationId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10

    const result = await userService.listUsers(organizationId, { search, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list users failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list users' })
  }
})

// Invite user
router.post('/:id/users', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id
    if (!requireOrgAccess(req, organizationId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const input = inviteSchema.parse(req.body)
    const user = await userService.inviteUser(organizationId, input, req.user?.id)
    logger.info({ organizationId, email: input.email }, 'user invited')
    res.status(201).json({ user })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'invite user failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to invite user' })
  }
})

// Update user (edit, change role, activate/deactivate)
router.put('/:id/users/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id
    if (!requireOrgAccess(req, organizationId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const input = updateSchema.parse(req.body)
    const user = await userService.updateUser(organizationId, req.params.userId, input, req.user?.id)
    logger.info({ organizationId, userId: req.params.userId }, 'user updated')
    res.status(200).json({ user })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update user failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update user' })
  }
})

// Delete user
router.delete('/:id/users/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id
    if (!requireOrgAccess(req, organizationId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await userService.deleteUser(organizationId, req.params.userId)
    logger.info({ organizationId, userId: req.params.userId }, 'user deleted')
    res.status(200).json({ message: 'User deleted successfully' })
  } catch (err) {
    logger.error(err, 'delete user failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete user' })
  }
})

export default router
