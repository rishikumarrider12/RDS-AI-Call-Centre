'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
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
  Select,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@rds/ui'
import { ArrowLeft, ArrowRight, Receipt, Wallet } from 'lucide-react'
import type { Transaction } from '@rds/types'

const PAGE_SIZE = 10

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const TYPE_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  payment: 'success',
  refund: 'info',
  credit: 'success',
  debit: 'danger',
  adjustment: 'warning',
}

export default function TransactionsPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''

  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['transactions', orgId, type, page],
    queryFn: () => api.listTransactions({ type: type || undefined, page, pageSize: PAGE_SIZE }),
    enabled: !!orgId,
  })

  const transactions = data?.transactions ?? []
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Receipt className="h-6 w-6 text-violet-400" /> Transactions
        </h1>
        <p className="text-sm text-neutral-450 mt-1">View all billing transactions and payment history.</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="sm:w-48">
              <option value="">All types</option>
              <option value="payment">Payment</option>
              <option value="refund">Refund</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="adjustment">Adjustment</option>
            </Select>
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : isError ? (
            <ErrorState message={(error as any)?.message || 'Failed to load transactions'} onRetry={() => refetch()} />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-7 w-7" />}
              title="No transactions"
              description="Transaction records will appear here."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: Transaction) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium text-white font-mono text-xs">{tx.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge variant={TYPE_COLORS[tx.type] || 'default'} className="capitalize">{tx.type}</Badge>
                      </TableCell>
                      <TableCell className={`font-medium ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(tx.amount, tx.currency)}
                      </TableCell>
                      <TableCell className="text-neutral-400">{tx.currency}</TableCell>
                      <TableCell className="text-neutral-400">{tx.description || '—'}</TableCell>
                      <TableCell className="text-neutral-400">{formatDate(tx.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    <ArrowLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
