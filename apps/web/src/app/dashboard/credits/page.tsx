'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
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
import { Plus, Trash2, Wallet, Loader2 } from 'lucide-react'
import type { Credit } from '@rds/types'

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

export default function CreditsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['credits', orgId],
    queryFn: () => api.listCredits(),
    enabled: !!orgId,
  })

  const credits = data?.credits ?? []
  const balance = data?.balance ?? 0

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['credits', orgId] })

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCredit({
        amount: Number(amount),
        currency,
        reason: reason || null,
        expiresAt: expiresAt || null,
      }),
    onSuccess: () => {
      setOpen(false)
      setAmount('')
      setCurrency('USD')
      setReason('')
      setExpiresAt('')
      invalidate()
      toast('Credit added', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to add credit', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCredit(id),
    onSuccess: () => {
      invalidate()
      toast('Credit deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete credit', 'error'),
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Wallet className="h-6 w-6 text-violet-400" /> Credits
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Manage prepaid credit balances and top-ups.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Credit
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-600/10 text-violet-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(balance)}</p>
              <p className="text-xs text-neutral-500">Current Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-600/10 text-sky-400">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{credits.length}</p>
              <p className="text-xs text-neutral-500">Total Credits</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load credits'} onRetry={() => refetch()} />
      ) : credits.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-7 w-7" />}
          title="No credits yet"
          description="Add credit to prepay for services."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.map((credit: Credit) => (
                  <TableRow key={credit.id}>
                    <TableCell className="font-medium text-white">{formatCurrency(credit.amount, credit.currency)}</TableCell>
                    <TableCell className="text-neutral-400">{credit.currency}</TableCell>
                    <TableCell className="text-neutral-400">{credit.reason || '—'}</TableCell>
                    <TableCell className="text-neutral-400">{credit.expiresAt ? new Date(credit.expiresAt).toLocaleDateString() : 'Never'}</TableCell>
                    <TableCell className="text-neutral-400">{new Date(credit.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (confirm('Delete this credit entry? This cannot be undone.')) deleteMutation.mutate(credit.id)
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

      {open && (
        <Dialog open onClose={() => setOpen(false)}>
          <DialogHeader title="Add Credit" onClose={() => setOpen(false)} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Amount</span>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Currency</span>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Reason</span>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" rows={3} />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Expires At (optional)</span>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !amount || Number(amount) <= 0}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Credit
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
