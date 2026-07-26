import { UserRepository } from '../repositories/user.repository'

const userRepository = new UserRepository()

/**
 * Resolves the internal `users.id` (primary key) from a Supabase auth user id.
 * Several tables (campaigns, contact_lists) reference `users(id)` via `created_by`,
 * while the authenticated request only carries the Supabase auth id.
 */
export async function resolveDbUserId(authUserId: string): Promise<string> {
  const dbUser = await userRepository.findByAuthUserId(authUserId)
  if (!dbUser) {
    throw new Error('User record not found')
  }
  return dbUser.id
}
