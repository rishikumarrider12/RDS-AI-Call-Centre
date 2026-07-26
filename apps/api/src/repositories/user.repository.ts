import { supabaseAdmin } from '../lib/supabase'
import type { UserRole, UserStatus } from '@rds/types'

export interface CreateUserInput {
  organizationId: string
  authUserId: string
  email: string
  fullName: string
  role: UserRole
  status: UserStatus
  assignedBy?: string | null
}

export interface UpdateUserInput {
  fullName?: string
  status?: UserStatus
}

export class UserRepository {
  private mapDbUser(dbUser: any): any {
    const roleRow = Array.isArray(dbUser.user_roles) ? dbUser.user_roles[0] : undefined
    const roleName = roleRow?.roles?.name as UserRole | undefined
    return {
      id: dbUser.id,
      authUserId: dbUser.auth_user_id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      avatarUrl: dbUser.avatar_url,
      organizationId: dbUser.organization_id,
      role: roleName,
      status: dbUser.status,
      lastLoginAt: dbUser.last_login_at,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      deletedAt: dbUser.deleted_at,
    }
  }

  async list(
    organizationId: string,
    options: { search?: string; page?: number; pageSize?: number }
  ) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 10
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('users')
      .select('*, user_roles(roles(name))', { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(`email.ilike.${term},full_name.ilike.${term}`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return {
      users: (data || []).map((u: any) => this.mapDbUser(u)),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*, user_roles(roles(name))')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data ? this.mapDbUser(data) : null
  }

  async findByAuthUserId(authUserId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async createUser(input: CreateUserInput) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        organization_id: input.organizationId,
        auth_user_id: input.authUserId,
        email: input.email,
        full_name: input.fullName,
        status: input.status,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        full_name: input.fullName,
        status: input.status,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async deleteUser(id: string) {
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('users')
      .update({ deleted_at: now })
      .eq('id', id)
    if (error) throw error
  }

  async updateUserOrganization(authUserId: string, organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ organization_id: organizationId })
      .eq('auth_user_id', authUserId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async ensureRole(organizationId: string, roleName: string) {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('name', roleName)
      .or(`organization_id.eq.${organizationId},is_system.eq.true`)
      .maybeSingle()
    if (findError) throw findError
    if (existing) return existing

    const { data, error } = await supabaseAdmin
      .from('roles')
      .insert({
        organization_id: organizationId,
        name: roleName,
        description: `${roleName} role`,
        is_system: false,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async assignRole(userId: string, organizationId: string, roleId: string, assignedBy?: string | null) {
    const { error } = await supabaseAdmin.from('user_roles').upsert(
      {
        user_id: userId,
        role_id: roleId,
        organization_id: organizationId,
        assigned_by: assignedBy ?? null,
      },
      { onConflict: 'user_id,role_id,organization_id' }
    )
    if (error) throw error
  }

  async clearRoles(userId: string, organizationId: string) {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
    if (error) throw error
  }
}
