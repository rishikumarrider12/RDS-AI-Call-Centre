'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Textarea,
  useToast,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@rds/ui'
import { Plus, Pencil, Trash2, Tag, Loader2 } from 'lucide-react'
import type { Plan } from '@rds/types'

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

export default function PlansPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [priceMonthly, setPriceMonthly] = useState('')
  const [priceYearly, setPriceYearly] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [sortOrder, setSortOrder] = useState('0')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['plans', orgId],
    queryFn: () => api.listPlans(),
    enabled: !!orgId,
  })

  const plans = data?.plans ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['plans', orgId] })

  const resetForm = () => {
    setName('')
    setSlug('')
    setDescription('')
    setPriceMonthly('')
    setPriceYearly('')
    setCurrency('USD')
    setSortOrder('0')
    setEditId(null)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createPlan({
        name,
        slug,
        description: description || null,
        priceMonthly: Number(priceMonthly),
        priceYearly: Number(priceYearly),
        currency,
        sortOrder: Number(sortOrder),
      }),
    onSuccess: () => {
      setOpen(false)
      resetForm()
      invalidate()
      toast('Plan created', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to create plan', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updatePlan(editId!, {
        name,
        slug,
        description: description || null,
        priceMonthly: Number(priceMonthly),
        priceYearly: Number(priceYearly),
        currency,
        sortOrder: Number(sortOrder),
      }),
    onSuccess: () => {
      setOpen(false)
      resetForm()
      invalidate()
      toast('Plan updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update plan', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePlan(id),
    onSuccess: () => {
      invalidate()
      toast('Plan deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete plan', 'error'),
  })

  const openEdit = (plan: Plan) => {
    setName(plan.name)
    setSlug(plan.slug)
    setDescription(plan.description || '')
    setPriceMonthly(String(plan.priceMonthly))
    setPriceYearly(String(plan.priceYearly))
    setCurrency(plan.currency)
    setSortOrder(String(plan.sortOrder))
    setEditId(plan.id)
    setOpen(true)
  }

  const handleSubmit = () => {
    if (editId) updateMutation.mutate()
    else createMutation.mutate()
  }

  const pending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Tag className="h-6 w-6 text-violet-400" /> Plans
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Create and manage subscription plans for your organization.</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true) }}>
          <Plus className="h-4 w-4" /> New Plan
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load plans'} onRetry={() => refetch()} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-7 w-7" />}
          title="No plans yet"
          description="Create your first subscription plan to get started."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Yearly</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan: Plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium text-white">{plan.name}</TableCell>
                    <TableCell className="text-neutral-400 font-mono text-xs">{plan.slug}</TableCell>
                    <TableCell className="text-neutral-400">{formatCurrency(plan.priceMonthly, plan.currency)}</TableCell>
                    <TableCell className="text-neutral-400">{formatCurrency(plan.priceYearly, plan.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? 'success' : 'warning'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(plan)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (confirm('Delete this plan? This cannot be undone.')) deleteMutation.mutate(plan.id)
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
          </CardContent>
        </Card>
      )}

      {(open || editId) && (
        <Dialog open onClose={() => { setOpen(false); resetForm() }}>
          <DialogHeader title={editId ? 'Edit Plan' : 'New Plan'} onClose={() => { setOpen(false); resetForm() }} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Growth" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Slug</span>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="growth" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Description</span>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Best for scaling teams" rows={3} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Monthly Price</span>
                <Input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} placeholder="0" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Yearly Price</span>
                <Input type="number" value={priceYearly} onChange={(e) => setPriceYearly(e.target.value)} placeholder="0" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Currency</span>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Sort Order</span>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={pending || !name.trim() || !slug.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
