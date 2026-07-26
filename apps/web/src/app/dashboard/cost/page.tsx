'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  EmptyState,
  ErrorState,
  LoadingState,
  useToast,
} from '@rds/ui'
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  Gauge,
} from 'lucide-react'
import type { BudgetStatus, CostCategory, CostSummaryCategory, SpendingAlert } from '@rds/types'

const CATEGORY_LABELS: Record<string, string> = {
  total: 'Total',
  telephony: 'Telephony',
  ai: 'AI',
  stt: 'STT',
  tts: 'TTS',
  storage: 'Storage',
  other: 'Other',
}

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

function statusVariant(status: BudgetStatus['status']): 'success' | 'warning' | 'danger' {
  if (status === 'exceeded') return 'danger'
  if (status === 'warning') return 'warning'
  return 'success'
}

export default function CostCenterPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [category, setCategory] = useState<CostCategory | 'total'>('total')
  const [period, setPeriod] = useState<'monthly' | 'daily'>('monthly')
  const [limitAmount, setLimitAmount] = useState('')
  const [warnThreshold, setWarnThreshold] = useState('0.8')
  const [alertThreshold, setAlertThreshold] = useState('1')

  const dashboardQuery = useQuery({
    queryKey: ['cost', 'dashboard', orgId],
    queryFn: () => api.getCostDashboard(),
    enabled: !!orgId,
    refetchInterval: 30000,
  })

  const budgetsQuery = useQuery({
    queryKey: ['cost', 'budgets', orgId],
    queryFn: () => api.listBudgets(),
    enabled: !!orgId,
  })

  const alertsQuery = useQuery({
    queryKey: ['cost', 'alerts', orgId],
    queryFn: () => api.listCostAlerts({ pageSize: 25 }),
    enabled: !!orgId,
  })

  const createBudget = useMutation({
    mutationFn: () =>
      api.createBudget({
        category,
        period,
        limitAmount: Number(limitAmount),
        currency: dashboardQuery.data?.currency || 'USD',
        warnThreshold: Number(warnThreshold),
        alertThreshold: Number(alertThreshold),
      }),
    onSuccess: () => {
      toast('Budget created', 'success')
      setCreateOpen(false)
      setLimitAmount('')
      queryClient.invalidateQueries({ queryKey: ['cost', 'budgets', orgId] })
      queryClient.invalidateQueries({ queryKey: ['cost', 'dashboard', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to create budget', 'error'),
  })

  const deleteBudget = useMutation({
    mutationFn: (id: string) => api.deleteBudget(id),
    onSuccess: () => {
      toast('Budget removed', 'success')
      queryClient.invalidateQueries({ queryKey: ['cost', 'budgets', orgId] })
      queryClient.invalidateQueries({ queryKey: ['cost', 'dashboard', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete budget', 'error'),
  })

  const evaluateBudgets = useMutation({
    mutationFn: () => api.evaluateBudgets(),
    onSuccess: (data) => {
      toast(data.alerts.length ? `${data.alerts.length} alert(s) raised` : 'Budgets evaluated — no alerts', 'info')
      queryClient.invalidateQueries({ queryKey: ['cost', 'alerts', orgId] })
      queryClient.invalidateQueries({ queryKey: ['cost', 'budgets', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to evaluate budgets', 'error'),
  })

  if (!orgId) return <LoadingState label="Loading organization…" />

  const dashboard = dashboardQuery.data
  const summary = dashboard?.summary
  const currency = summary?.currency || 'USD'
  const budgets = budgetsQuery.data?.budgets || []
  const statuses: BudgetStatus[] = budgetsQuery.data?.statuses || []
  const alerts: SpendingAlert[] = alertsQuery.data?.alerts || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Wallet className="h-6 w-6 text-violet-400" /> Cost Center
        </h1>
        <p className="text-sm text-neutral-450 mt-1">
          Track telephony, AI, STT, TTS and storage spend per organization, and manage budget caps.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="info">{currency} billing</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            dashboardQuery.refetch()
            budgetsQuery.refetch()
            alertsQuery.refetch()
            toast('Refreshed', 'info')
          }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {dashboardQuery.isLoading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading cost center…
        </div>
      ) : dashboardQuery.isError ? (
        <ErrorState
          message={(dashboardQuery.error as any)?.message || 'Failed to load cost center'}
          onRetry={() => dashboardQuery.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="This Month"
              value={formatCurrency(summary?.totalCost ?? 0, currency)}
              tone="violet"
            />
            <StatCard
              icon={<Wallet className="h-5 w-5" />}
              label="Budgets"
              value={String(budgets.length)}
              tone="sky"
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Alerts"
              value={String(alerts.length)}
              tone="amber"
            />
            <StatCard
              icon={<Gauge className="h-5 w-5" />}
              label="Over Budget"
              value={String(statuses.filter((s) => s.status === 'exceeded').length)}
              tone="emerald"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-violet-400" /> Spend by Category
                </CardTitle>
                <CardDescription>This month's cost rollup across services.</CardDescription>
              </CardHeader>
              <CardContent>
                {(summary?.byCategory?.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={<Wallet className="h-7 w-7" />}
                    title="No spend yet"
                    description="Cost records appear once calls and AI usage are processed."
                  />
                ) : (
                  <div className="space-y-3">
                    {summary?.byCategory.map((c: CostSummaryCategory) => {
                      const pct = summary.totalCost > 0 ? (c.cost / summary.totalCost) * 100 : 0
                      return (
                        <div key={c.category}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-neutral-300">{CATEGORY_LABELS[c.category] || c.category}</span>
                            <span className="text-white font-medium">{formatCurrency(c.cost, currency)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-violet-500" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-violet-400" /> Daily Usage (Cost)
                </CardTitle>
                <CardDescription>Per-day spend from the most recent usage records.</CardDescription>
              </CardHeader>
              <CardContent>
                {(dashboard?.usage?.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={<TrendingUp className="h-7 w-7" />}
                    title="No usage yet"
                    description="Daily usage records appear as the system processes calls."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">AI min</TableHead>
                        <TableHead className="text-right">Phone min</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard?.usage.slice(0, 8).map((u, i) => (
                        <TableRow key={i}>
                          <TableCell>{formatDate(u.recordDate)}</TableCell>
                          <TableCell className="text-right">{u.aiMinutes}</TableCell>
                          <TableCell className="text-right">{u.telephonyMinutes}</TableCell>
                          <TableCell className="text-right text-white font-semibold">
                            {formatCurrency(u.cost, currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-violet-400" /> Budgets
                  </CardTitle>
                  <CardDescription>Monthly or daily spend caps with warning and limit thresholds.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => evaluateBudgets.mutate()}
                    disabled={evaluateBudgets.isPending}
                  >
                    {evaluateBudgets.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
                    Evaluate
                  </Button>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" /> Add Budget
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(budgets.length === 0 && !budgetsQuery.isLoading) ? (
                <EmptyState
                  icon={<Gauge className="h-7 w-7" />}
                  title="No budgets configured"
                  description="Add a spend cap to receive alerts when usage approaches the limit."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Limit</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Utilization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statuses.map((s) => (
                      <TableRow key={s.budget.id}>
                        <TableCell className="text-white font-medium">
                          {CATEGORY_LABELS[s.budget.category] || s.budget.category}
                        </TableCell>
                        <TableCell className="capitalize text-neutral-400">{s.budget.period}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.budget.limitAmount, currency)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.spent, currency)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.remaining, currency)}</TableCell>
                        <TableCell className="text-right">{Math.round(s.utilization * 100)}%</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBudget.mutate(s.budget.id)}
                            disabled={deleteBudget.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" /> Spending Alerts
              </CardTitle>
              <CardDescription>Threshold crossings raised by budget evaluation.</CardDescription>
            </CardHeader>
            <CardContent>
              {(alerts.length === 0 && !alertsQuery.isLoading) ? (
                <EmptyState
                  icon={<AlertTriangle className="h-7 w-7" />}
                  title="No alerts"
                  description="Spending alerts will appear here when budgets are exceeded."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Limit</TableHead>
                      <TableHead>Notified</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Badge variant={a.level === 'limit' ? 'danger' : 'warning'}>{a.level}</Badge>
                        </TableCell>
                        <TableCell className="text-neutral-300">{CATEGORY_LABELS[a.category] || a.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(a.spent, a.currency)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(a.limitAmount, a.currency)}</TableCell>
                        <TableCell>{a.notified ? <Badge variant="success">yes</Badge> : <Badge variant="default">no</Badge>}</TableCell>
                        <TableCell className="text-neutral-400">{formatDate(a.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogHeader title="New Budget" onClose={() => setCreateOpen(false)} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as CostCategory | 'total')}>
              <option value="total">Total</option>
              <option value="telephony">Telephony</option>
              <option value="ai">AI</option>
              <option value="stt">STT</option>
              <option value="tts">TTS</option>
              <option value="storage">Storage</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Period</label>
            <Select value={period} onChange={(e) => setPeriod(e.target.value as 'monthly' | 'daily')}>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Limit amount ({currency})</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="1000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Warn at (0–1)</label>
              <Input type="number" min="0" max="1" step="0.05" value={warnThreshold} onChange={(e) => setWarnThreshold(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Alert at (0–1)</label>
              <Input type="number" min="0" max="1" step="0.05" value={alertThreshold} onChange={(e) => setAlertThreshold(e.target.value)} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => createBudget.mutate()} disabled={createBudget.isPending || !limitAmount}>
            {createBudget.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
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
