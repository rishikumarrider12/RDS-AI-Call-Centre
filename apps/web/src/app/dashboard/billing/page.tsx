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
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  EmptyState,
  ErrorState,
  TableSkeleton,
  useToast,
} from '@rds/ui'
import {
  CreditCard,
  Download,
  FileText,
  Loader2,
  Wallet,
  TrendingUp,
  PhoneCall,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
} from 'lucide-react'
import type { Invoice, UsageRecord } from '@rds/types'

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'violet' | 'emerald' | 'amber' | 'sky'
}) {
  const tones: Record<string, string> = {
    violet: 'text-violet-400 bg-violet-600/10 border-violet-500/20',
    emerald: 'text-emerald-400 bg-emerald-600/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-600/10 border-amber-500/20',
    sky: 'text-sky-400 bg-sky-600/10 border-sky-500/20',
  }
  return (
    <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center gap-4">
      <div className={`p-3 rounded-lg border ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

export default function BillingDashboardPage() {
  const { user } = useSession()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [status, setStatus] = useState('')
  const [invoicePage, setInvoicePage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [usagePage, setUsagePage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['billing', orgId],
    queryFn: () => api.getBillingDashboard(),
    enabled: !!orgId,
  })

  const { data: invoicesData, isFetching: invoicesLoading } = useQuery({
    queryKey: ['invoices', orgId, status, invoicePage],
    queryFn: () => api.listInvoices({ status: status || undefined, page: invoicePage, pageSize: PAGE_SIZE }),
    enabled: !!orgId,
  })

  const { data: usageData, isFetching: usageLoading } = useQuery({
    queryKey: ['usage', orgId, dateFrom, dateTo, usagePage],
    queryFn: () => api.listUsage({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page: usagePage, pageSize: PAGE_SIZE }),
    enabled: !!orgId,
  })

  const dashboard = data
  const summary = dashboard?.summary
  const currency = summary?.currency || 'USD'

  const invoiceTotal = invoicesData?.total ?? 0
  const invoicePages = Math.max(1, Math.ceil(invoiceTotal / PAGE_SIZE))
  const usageTotal = usageData?.total ?? 0
  const usagePages = Math.max(1, Math.ceil(usageTotal / PAGE_SIZE))

  const handleExport = (resource: 'invoices' | 'usage', format: 'csv' | 'json') => {
    const qs = new URLSearchParams({ resource, format })
    if (resource === 'invoices' && status) qs.set('status', status)
    if (resource === 'usage') {
      if (dateFrom) qs.set('dateFrom', dateFrom)
      if (dateTo) qs.set('dateTo', dateTo)
    }
    const stamp = new Date().toISOString().slice(0, 10)
    api
      .downloadFile(`/api/billing/export?${qs.toString()}`, `${resource}-${stamp}.${format}`)
      .then(() => toast('Export started', 'success'))
      .catch((err: any) => toast(err.message || 'Export failed', 'error'))
  }

  const invoiceStatusVariant = (s: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (s) {
      case 'paid':
        return 'success'
      case 'open':
        return 'warning'
      case 'void':
      case 'uncollectible':
        return 'danger'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-violet-400" /> Billing
        </h1>
        <p className="text-sm text-neutral-450 mt-1">Track spend, manage subscriptions and review usage.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading billing…
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load billing'} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total Spent" value={formatCurrency(summary?.totalSpent ?? 0, currency)} tone="violet" />
            <StatCard icon={<FileText className="h-5 w-5" />} label="Outstanding" value={formatCurrency(summary?.outstanding ?? 0, currency)} tone="amber" />
            <StatCard icon={<PhoneCall className="h-5 w-5" />} label="Period Calls" value={String(summary?.currentPeriodCalls ?? 0)} tone="sky" />
            <StatCard icon={<Wallet className="h-5 w-5" />} label="Wallet" value={dashboard?.wallet ? formatCurrency(dashboard.wallet.balance, dashboard.wallet.currency) : '—'} tone="emerald" />
          </div>

          {dashboard?.subscription && (
            <Card>
              <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Current Subscription</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xl font-bold text-white capitalize">{dashboard.subscription.plan}</span>
                    <Badge variant={dashboard.subscription.status === 'active' ? 'success' : 'warning'} className="capitalize">
                      {dashboard.subscription.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {formatDate(dashboard.subscription.currentPeriodStart)} – {formatDate(dashboard.subscription.currentPeriodEnd)}
                  </p>
                </div>
                <Button variant="outline" onClick={() => (window.location.href = '/dashboard/subscription')}>
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <Select value={status} onChange={(e) => { setStatus(e.target.value); setInvoicePage(1) }} className="sm:w-48">
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="paid">Paid</option>
                  <option value="void">Void</option>
                  <option value="uncollectible">Uncollectible</option>
                </Select>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport('invoices', 'csv')}>
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('invoices', 'json')}>
                    <Download className="h-4 w-4" /> JSON
                  </Button>
                </div>
              </div>

              {invoicesLoading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : (invoicesData?.data.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<FileText className="h-7 w-7" />}
                  title="No invoices yet"
                  description="Invoices for your subscription and usage will appear here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoicesData?.data ?? []).map((inv: Invoice) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium text-white font-mono text-xs">{inv.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-neutral-400">{formatDate(inv.createdAt)}</TableCell>
                        <TableCell className="text-neutral-200">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={invoiceStatusVariant(inv.status)} className="capitalize">{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-neutral-400">{formatDate(inv.dueAt)}</TableCell>
                        <TableCell className="text-neutral-400">{formatDate(inv.paidAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
                <span>Page {invoicePage} of {invoicePages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setInvoicePage((p) => Math.max(1, p - 1))} disabled={invoicePage <= 1}>
                    <ArrowLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setInvoicePage((p) => Math.min(invoicePages, p + 1))} disabled={invoicePage >= invoicePages}>
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex gap-2">
                  <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setUsagePage(1) }} className="sm:w-44" />
                  <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setUsagePage(1) }} className="sm:w-44" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport('usage', 'csv')}>
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('usage', 'json')}>
                    <Download className="h-4 w-4" /> JSON
                  </Button>
                </div>
              </div>

              {usageLoading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : (usageData?.data.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-7 w-7" />}
                  title="No usage records"
                  description="Usage records for the selected date range will appear here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>AI Min</TableHead>
                      <TableHead>Telephony Min</TableHead>
                      <TableHead>STT Min</TableHead>
                      <TableHead>Storage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(usageData?.data ?? []).map((u: UsageRecord) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-white">{formatDate(u.recordDate)}</TableCell>
                        <TableCell className="text-neutral-400">{u.callsCount}</TableCell>
                        <TableCell className="text-neutral-400">{u.aiMinutes}</TableCell>
                        <TableCell className="text-neutral-400">{u.telephonyMinutes}</TableCell>
                        <TableCell className="text-neutral-400">{u.sttMinutes}</TableCell>
                        <TableCell className="text-neutral-400">{formatBytes(u.storageBytes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
                <span>Page {usagePage} of {usagePages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setUsagePage((p) => Math.max(1, p - 1))} disabled={usagePage <= 1}>
                    <ArrowLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setUsagePage((p) => Math.min(usagePages, p + 1))} disabled={usagePage >= usagePages}>
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
