'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
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
  useToast,
} from '@rds/ui'
import { CreditCard, Plus, Loader2, Trash2, Ban, RotateCcw, Pencil, CalendarClock } from 'lucide-react'
import type { Subscription, SubscriptionStatus } from '@rds/types'

const PLANS: Array<'starter' | 'growth' | 'enterprise'> = ['starter', 'growth', 'enterprise']
const STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'canceled']

const PLAN_PRICE: Record<string, string> = {
  starter: '$49 / mo',
  growth: '$199 / mo',
  enterprise: 'Custom',
}

function fmtDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusVariant(status: SubscriptionStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active':
      return 'success'
    case 'trialing':
      return 'info'
    case 'past_due':
      return 'danger'
    case 'canceled':
      return 'warning'
    default:
      return 'default'
  }
}

export default function SubscriptionPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [plan, setPlan] = useState<'starter' | 'growth' | 'enterprise'>('growth')
  const [status, setStatus] = useState<SubscriptionStatus>('active')

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', orgId],
    queryFn: () => api.listSubscriptions(),
    enabled: !!orgId,
  })

  const current = data?.current ?? null
  const subscriptions = data?.subscriptions ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subscriptions', orgId] })

  const createMutation = useMutation({
    mutationFn: () =>
      api.createSubscription({
        plan,
        status,
        currentPeriodStart: new Date().toISOString().slice(0, 10),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      setCreateOpen(false)
      invalidate()
      toast('Subscription created', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to create subscription', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: (id: string) => api.updateSubscription(id, { plan, status }),
    onSuccess: () => {
      setEditId(null)
      invalidate()
      toast('Subscription updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update subscription', 'error'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelSubscription(id),
    onSuccess: () => {
      invalidate()
      toast('Subscription canceled', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to cancel subscription', 'error'),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.reactivateSubscription(id),
    onSuccess: () => {
      invalidate()
      toast('Subscription reactivated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to reactivate subscription', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSubscription(id),
    onSuccess: () => {
      invalidate()
      toast('Subscription deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete subscription', 'error'),
  })

  const openEdit = (sub: Subscription) => {
    setPlan(sub.plan as 'starter' | 'growth' | 'enterprise')
    setStatus(sub.status)
    setEditId(sub.id)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-violet-400" /> Subscription Management
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Manage plans, billing periods and subscription lifecycle.</p>
        </div>
        <Button onClick={() => { setPlan('growth'); setStatus('active'); setCreateOpen(true) }}>
          <Plus className="h-4 w-4" /> New Subscription
        </Button>
      </div>

      {current && (
        <Card>
          <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-600/10 text-violet-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Current Plan</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-bold text-white capitalize">{current.plan}</span>
                  <Badge variant={statusVariant(current.status)} className="capitalize">{current.status}</Badge>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {fmtDate(current.currentPeriodStart)} – {fmtDate(current.currentPeriodEnd)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {current.status === 'canceled' ? (
                <Button variant="outline" onClick={() => reactivateMutation.mutate(current.id)} disabled={reactivateMutation.isPending}>
                  <RotateCcw className="h-4 w-4" /> Reactivate
                </Button>
              ) : (
                <Button variant="outline" onClick={() => cancelMutation.mutate(current.id)} disabled={cancelMutation.isPending}>
                  <Ban className="h-4 w-4" /> Cancel
                </Button>
              )}
              <Button variant="default" onClick={() => openEdit(current)}>
                <Pencil className="h-4 w-4" /> Change Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading subscriptions…
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-10 text-neutral-500">
              <CreditCard className="h-10 w-10 mx-auto mb-3 text-neutral-600" />
              No subscriptions yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: Subscription) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-white capitalize">{sub.plan}</TableCell>
                    <TableCell className="text-neutral-400">{PLAN_PRICE[sub.plan] ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(sub.status)} className="capitalize">{sub.status}</Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">{fmtDate(sub.currentPeriodStart)}</TableCell>
                    <TableCell className="text-neutral-400">{fmtDate(sub.currentPeriodEnd)}</TableCell>
                    <TableCell className="text-neutral-400">{fmtDate(sub.trialEndsAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(sub)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (confirm('Delete this subscription? This cannot be undone.')) deleteMutation.mutate(sub.id)
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(createOpen || editId) && (
        <Dialog open onClose={() => { setCreateOpen(false); setEditId(null) }}>
          <DialogHeader title={editId ? 'Edit Subscription' : 'New Subscription'} onClose={() => { setCreateOpen(false); setEditId(null) }} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Plan</span>
              <Select value={plan} onChange={(e) => setPlan(e.target.value as 'starter' | 'growth' | 'enterprise')}>
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p} {PLAN_PRICE[p] ? `(${PLAN_PRICE[p]})` : ''}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Status</span>
              <Select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setEditId(null) }}>
              Cancel
            </Button>
            <Button
              onClick={() => (editId ? updateMutation.mutate(editId) : createMutation.mutate())}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{' '}
              {editId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
