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
  Select,
  useToast,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@rds/ui'
import { Plus, Pencil, Trash2, Ticket, Percent, DollarSign, Loader2 } from 'lucide-react'
import type { Coupon } from '@rds/types'

const DISCOUNT_TYPES = ['percentage', 'fixed', 'free_trial'] as const

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

export default function CouponsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'free_trial'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [appliesToPlan, setAppliesToPlan] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['coupons', orgId],
    queryFn: () => api.listCoupons(),
    enabled: !!orgId,
  })

  const coupons = data?.coupons ?? []
  const activeCoupons = coupons.filter((c) => c.isActive).length
  const totalRedeemed = coupons.reduce((sum, c) => sum + c.redeemedCount, 0)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['coupons', orgId] })

  const resetForm = () => {
    setCode('')
    setDescription('')
    setDiscountType('percentage')
    setDiscountValue('')
    setCurrency('USD')
    setMaxRedemptions('')
    setValidFrom('')
    setValidUntil('')
    setAppliesToPlan('')
    setEditId(null)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCoupon({
        code,
        description: description || null,
        discountType,
        discountValue: Number(discountValue),
        currency,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        appliesToPlan: appliesToPlan || null,
      }),
    onSuccess: () => {
      setOpen(false)
      resetForm()
      invalidate()
      toast('Coupon created', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to create coupon', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateCoupon(editId!, {
        code,
        description: description || null,
        discountType,
        discountValue: Number(discountValue),
        currency,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        appliesToPlan: appliesToPlan || null,
      }),
    onSuccess: () => {
      setOpen(false)
      resetForm()
      invalidate()
      toast('Coupon updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update coupon', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCoupon(id),
    onSuccess: () => {
      invalidate()
      toast('Coupon deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete coupon', 'error'),
  })

  const redeemMutation = useMutation({
    mutationFn: (id: string) => api.redeemCoupon(id),
    onSuccess: () => {
      invalidate()
      toast('Coupon redeemed', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to redeem coupon', 'error'),
  })

  const openEdit = (coupon: Coupon) => {
    setCode(coupon.code)
    setDescription(coupon.description || '')
    setDiscountType(coupon.discountType)
    setDiscountValue(String(coupon.discountValue))
    setCurrency(coupon.currency)
    setMaxRedemptions(coupon.maxRedemptions ? String(coupon.maxRedemptions) : '')
    setValidFrom(coupon.validFrom || '')
    setValidUntil(coupon.validUntil || '')
    setAppliesToPlan(coupon.appliesToPlan || '')
    setEditId(coupon.id)
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
            <Ticket className="h-6 w-6 text-violet-400" /> Coupons
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Create discount codes and promotional offers.</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true) }}>
          <Plus className="h-4 w-4" /> New Coupon
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-600/10 text-violet-400">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{coupons.length}</p>
              <p className="text-xs text-neutral-500">Total Coupons</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-600/10 text-emerald-400">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeCoupons}</p>
              <p className="text-xs text-neutral-500">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-600/10 text-amber-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalRedeemed}</p>
              <p className="text-xs text-neutral-500">Total Redeemed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load coupons'} onRetry={() => refetch()} />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-7 w-7" />}
          title="No coupons yet"
          description="Create your first coupon to offer discounts."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon: Coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium text-white font-mono text-xs">{coupon.code}</TableCell>
                    <TableCell className="text-neutral-400 capitalize">{coupon.discountType}</TableCell>
                    <TableCell className="text-neutral-400">{coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue, coupon.currency)}</TableCell>
                    <TableCell className="text-neutral-400">{coupon.redeemedCount}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ''}</TableCell>
                    <TableCell className="text-neutral-400">
                      {coupon.validFrom && coupon.validUntil
                        ? `${new Date(coupon.validFrom).toLocaleDateString()} – ${new Date(coupon.validUntil).toLocaleDateString()}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.isActive ? 'success' : 'warning'}>{coupon.isActive ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Redeem"
                          onClick={() => redeemMutation.mutate(coupon.id)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-850 transition-colors"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(coupon)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (confirm('Delete this coupon? This cannot be undone.')) deleteMutation.mutate(coupon.id)
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
          <DialogHeader title={editId ? 'Edit Coupon' : 'New Coupon'} onClose={() => { setOpen(false); resetForm() }} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Code</span>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER25" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Description</span>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Summer promotion" rows={3} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Discount Type</span>
                <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
                  {DISCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Discount Value</span>
                <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="25" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Max Redemptions</span>
                <Input type="number" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Unlimited" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Applies To Plan</span>
                <Input value={appliesToPlan} onChange={(e) => setAppliesToPlan(e.target.value)} placeholder="All plans" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Valid From</span>
                <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">Valid Until</span>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={pending || !code.trim() || !discountValue}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
