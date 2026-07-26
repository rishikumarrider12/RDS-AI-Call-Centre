import crypto from 'crypto'
import { supabaseAdmin } from '../lib/supabase'
import { UserRepository } from '../repositories/user.repository'
import { logger } from '../lib/logger'
import type { OrganizationUser, Paginated, UserRole, UserStatus } from '@rds/types'

function randomPassword(): string {
  return crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'A1!'
}

async function findAuthUserByEmail(email: string) {
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
  } catch (err) {
    logger.warn({ error: err instanceof Error ? err.message : 'unknown' }, 'listUsers failed during user lookup')
    return null
  }
}

async function createAuthUser(email: string, fullName: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: false,
    user_metadata: { full_name: fullName },
  })
  if (error) throw error
  return data.user!
}

export interface InviteUserInput {
  email: string
  fullName: string
  role: UserRole
}

export class UserService {
  private repository = new UserRepository()

  private toOrganizationUser(dbUser: any): OrganizationUser {
    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      avatarUrl: dbUser.avatarUrl ?? null,
      role: (dbUser.role as UserRole) || 'viewer',
      status: dbUser.status as UserStatus,
      lastLoginAt: dbUser.lastLoginAt ?? null,
      createdAt: dbUser.createdAt,
    }
  }

  async listUsers(
    organizationId: string,
    options: { search?: string; page?: number; pageSize?: number }
  ): Promise<Paginated<OrganizationUser>> {
    const result = await this.repository.list(organizationId, options)
    return {
      data: result.users.map((u: any) => this.toOrganizationUser(u)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  private async assignRoleInternal(
    userId: string,
    organizationId: string,
    role: UserRole,
    assignedBy?: string | null
  ) {
    const roleRow = await this.repository.ensureRole(organizationId, role)
    await this.repository.clearRoles(userId, organizationId)
    await this.repository.assignRole(userId, organizationId, roleRow.id, assignedBy)

    const dbUser = await this.repository.findById(userId)
    if (dbUser?.authUserId) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(dbUser.authUserId, {
          user_metadata: { roles: [role] },
        })
      } catch (err) {
        logger.warn({ error: err instanceof Error ? err.message : 'unknown' }, 'failed to sync role metadata')
      }
    }
  }

  async inviteUser(organizationId: string, input: InviteUserInput, invitedByAuthUserId?: string) {
    const existingDb = await this.repository.findByEmail(input.email)
    if (existingDb) {
      throw new Error('A user with this email already exists')
    }

    let authUserId = ''
    const existingAuth = await findAuthUserByEmail(input.email)
    if (existingAuth) {
      authUserId = existingAuth.id
    } else {
      const created = await createAuthUser(input.email, input.fullName)
      authUserId = created.id
    }

    const dbUser = await this.repository.createUser({
      organizationId,
      authUserId,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      status: 'invited',
      assignedBy: invitedByAuthUserId ?? null,
    })

    await this.assignRoleInternal(dbUser.id, organizationId, input.role, invitedByAuthUserId ?? null)
    return this.toOrganizationUser(await this.repository.findById(dbUser.id))
  }

  async updateUser(
    organizationId: string,
    userId: string,
    input: { fullName?: string; status?: UserStatus; role?: UserRole },
    actorAuthUserId?: string
  ) {
    const existing = await this.repository.findById(userId)
    if (!existing) throw new Error('User not found')
    if (existing.organizationId !== organizationId) {
      throw new Error('User does not belong to this organization')
    }

    if (input.fullName !== undefined || input.status !== undefined) {
      await this.repository.updateUser(userId, {
        fullName: input.fullName,
        status: input.status,
      })
    }

    if (input.role) {
      await this.assignRoleInternal(userId, organizationId, input.role, actorAuthUserId ?? null)
    }

    return this.toOrganizationUser(await this.repository.findById(userId))
  }

  async deleteUser(organizationId: string, userId: string) {
    const existing = await this.repository.findById(userId)
    if (!existing) throw new Error('User not found')
    if (existing.organizationId !== organizationId) {
      throw new Error('User does not belong to this organization')
    }
    await this.repository.deleteUser(userId)
  }
}
