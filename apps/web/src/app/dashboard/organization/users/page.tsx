'use client'

import { useState, type ReactNode } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Input,
  Select,
  Badge,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  ErrorState,
  TableSkeleton,
  useToast,
} from '@rds/ui'
import { Users, Search, Plus, Pencil, Trash2, UserCog, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { OrganizationUser } from '@rds/types'

const ROLES: Array<OrganizationUser['role']> = ['super_admin', 'org_admin', 'agent', 'viewer']
const PAGE_SIZE = 10

function statusVariant(status: string) {
  if (status === 'active') return 'success' as const
  if (status === 'invited') return 'info' as const
  return 'warning' as const
}

export default function OrganizationUsersPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser, setEditUser] = useState<OrganizationUser | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orgUsers', orgId, search, page],
    queryFn: () => api.listUsers(orgId, { search, page, pageSize: PAGE_SIZE }),
    enabled: !!orgId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['orgUsers', orgId] })

  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; fullName: string; role: OrganizationUser['role'] }) =>
      api.inviteUser(orgId, input),
    onSuccess: () => {
      setInviteOpen(false)
      invalidate()
      toast('User invited successfully', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to invite user', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; fullName?: string; status?: string; role?: OrganizationUser['role'] }) =>
      api.updateUser(orgId, input.id, { fullName: input.fullName, status: input.status as any, role: input.role }),
    onSuccess: () => {
      setEditUser(null)
      invalidate()
      toast('User updated successfully', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update user', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(orgId, id),
    onSuccess: () => {
      invalidate()
      toast('User deleted successfully', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete user', 'error'),
  })

  const toggleStatus = (u: OrganizationUser) => {
    updateMutation.mutate({ id: u.id, status: u.status === 'active' ? 'suspended' : 'active' })
  }

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Organization Users</h1>
          <p className="text-sm text-neutral-450 mt-1">Manage members, roles and access for your workspace.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" /> Invite User
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name or email"
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : isError ? (
            <ErrorState message={(error as any)?.message || 'Failed to load users'} onRetry={() => refetch()} />
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Users className="h-7 w-7" />}
              title="No users yet"
              description="Invite teammates to collaborate on your call centre workspace."
              action={
                <Button onClick={() => setInviteOpen(true)}>
                  <Plus className="h-4 w-4" /> Invite User
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-white">{u.fullName}</TableCell>
                    <TableCell className="text-neutral-400">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(u.status)} className="capitalize">
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <IconBtn title="Edit" onClick={() => setEditUser(u)}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title={u.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => toggleStatus(u)}>
                        <UserCog className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        title="Delete"
                        danger
                        onClick={() => {
                          if (confirm(`Delete user ${u.fullName}?`)) deleteMutation.mutate(u.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {inviteOpen && (
        <InviteDialog
          onClose={() => setInviteOpen(false)}
          onSubmit={(input) => inviteMutation.mutate(input)}
          pending={inviteMutation.isPending}
        />
      )}
      {editUser && (
        <EditDialog
          user={editUser}
          onClose={() => setEditUser(null)}
          onSubmit={(input) => updateMutation.mutate({ id: editUser.id, ...input })}
          pending={updateMutation.isPending}
        />
      )}
    </div>
  )
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: ReactNode
  title: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors ${
        danger ? 'hover:text-red-400' : ''
      }`}
    >
      {children}
    </button>
  )
}

function InviteDialog({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void
  onSubmit: (input: { email: string; fullName: string; role: OrganizationUser['role'] }) => void
  pending: boolean
}) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<OrganizationUser['role']>('agent')

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader title="Invite User" onClose={onClose} />
      <DialogBody className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-400">Full Name</span>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-400">Email</span>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-400">Role</span>
          <Select value={role} onChange={(e) => setRole(e.target.value as OrganizationUser['role'])}>
            {ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </label>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit({ email, fullName, role })}
          disabled={pending || !email || !fullName}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Send Invite
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function EditDialog({
  user,
  onClose,
  onSubmit,
  pending,
}: {
  user: OrganizationUser
  onClose: () => void
  onSubmit: (input: { fullName?: string; status?: string; role?: OrganizationUser['role'] }) => void
  pending: boolean
}) {
  const [fullName, setFullName] = useState(user.fullName)
  const [role, setRole] = useState<OrganizationUser['role']>(user.role)
  const [status, setStatus] = useState(user.status)

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader title="Edit User" onClose={onClose} />
      <DialogBody className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-400">Full Name</span>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-neutral-400">Role</span>
            <Select value={role} onChange={(e) => setRole(e.target.value as OrganizationUser['role'])}>
              {ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-neutral-400">Status</span>
            <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="active">active</option>
              <option value="invited">invited</option>
              <option value="suspended">suspended</option>
            </Select>
          </label>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit({ fullName, role, status })} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
