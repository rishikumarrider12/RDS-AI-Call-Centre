'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Input,
  Select,
  Badge,
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
import {
  Megaphone,
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Play,
  Pause,
  Square,
  Copy,
} from 'lucide-react'
import type { CampaignSummary, CampaignStatus } from '@rds/types'

const STATUS_OPTIONS: Array<CampaignStatus | ''> = ['', 'draft', 'scheduled', 'running', 'paused', 'ended']
const PAGE_SIZE = 10

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'running':
      return 'success'
    case 'scheduled':
      return 'info'
    case 'paused':
      return 'warning'
    case 'ended':
      return 'danger'
    default:
      return 'default'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'running':
      return 'Active'
    case 'ended':
      return 'Completed'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-neutral-800 overflow-hidden">
        <div className="h-full bg-violet-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-500">{pct}%</span>
    </div>
  )
}

export default function CampaignsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['campaigns', orgId, search, status, page],
    queryFn: () => api.listCampaigns({ search, status: status || undefined, page, pageSize: PAGE_SIZE }),
    enabled: !!orgId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCampaign(id),
    onSuccess: () => {
      invalidate()
      toast('Campaign deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete campaign', 'error'),
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => api.startCampaign(id),
    onSuccess: () => { invalidate(); toast('Campaign started', 'success') },
    onError: (err: any) => toast(err.message || 'Failed to start campaign', 'error'),
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseCampaign(id),
    onSuccess: () => { invalidate(); toast('Campaign paused', 'success') },
    onError: (err: any) => toast(err.message || 'Failed to pause campaign', 'error'),
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.resumeCampaign(id),
    onSuccess: () => { invalidate(); toast('Campaign resumed', 'success') },
    onError: (err: any) => toast(err.message || 'Failed to resume campaign', 'error'),
  })

  const stopMutation = useMutation({
    mutationFn: (id: string) => api.stopCampaign(id),
    onSuccess: () => { invalidate(); toast('Campaign stopped', 'success') },
    onError: (err: any) => toast(err.message || 'Failed to stop campaign', 'error'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.duplicateCampaign(id),
    onSuccess: () => { invalidate(); toast('Campaign duplicated', 'success') },
    onError: (err: any) => toast(err.message || 'Failed to duplicate campaign', 'error'),
  })

  const total = data?.total ?? 0
  const campaigns = data?.data ?? []
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const totalActive = campaigns.filter((c) => c.status === 'running').length
  const totalPaused = campaigns.filter((c) => c.status === 'paused').length
  const totalEnded = campaigns.filter((c) => c.status === 'ended').length

  const isMutating = startMutation.isPending || pauseMutation.isPending || resumeMutation.isPending || stopMutation.isPending || duplicateMutation.isPending || deleteMutation.isPending

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Campaigns</h1>
          <p className="text-sm text-neutral-450 mt-1">Create and manage outbound & inbound calling campaigns.</p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Megaphone className="h-5 w-5 text-violet-400" />} label="Total Campaigns" value={String(total)} />
        <StatCard icon={<Play className="h-5 w-5 text-emerald-400" />} label="Active" value={String(totalActive)} />
        <StatCard icon={<Pause className="h-5 w-5 text-amber-400" />} label="Paused" value={String(totalPaused)} />
        <StatCard icon={<Square className="h-5 w-5 text-red-400" />} label="Ended" value={String(totalEnded)} />
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search campaigns"
                className="pl-9"
              />
            </div>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="sm:w-44">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === '' ? 'All statuses' : statusLabel(s)}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : isError ? (
            <ErrorState
              message={(error as any)?.message || 'Failed to load campaigns'}
              onRetry={() => refetch()}
            />
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-7 w-7" />}
              title="No campaigns yet"
              description="Create your first calling campaign to start reaching contacts with the AI agent."
              action={
                <Link href="/dashboard/campaigns/new">
                  <Button>
                    <Plus className="h-4 w-4" /> New Campaign
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Connected</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c: CampaignSummary) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-white">
                        <Link href={`/dashboard/campaigns/${c.id}`} className="hover:text-violet-400 transition-colors">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status)} className="capitalize">
                          {statusLabel(c.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ProgressBar value={c.completedContacts} total={c.totalContacts} />
                      </TableCell>
                      <TableCell className="text-neutral-400">{c.totalCalls}</TableCell>
                      <TableCell className="text-neutral-400">{c.connectedCalls}</TableCell>
                      <TableCell className="text-neutral-400">
                        {c.totalCost ? `$${c.totalCost.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {c.status === 'draft' && (
                            <Button variant="ghost" size="sm" onClick={() => startMutation.mutate(c.id)} disabled={isMutating} title="Start">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {c.status === 'running' && (
                            <Button variant="ghost" size="sm" onClick={() => pauseMutation.mutate(c.id)} disabled={isMutating} title="Pause">
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {c.status === 'paused' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => resumeMutation.mutate(c.id)} disabled={isMutating} title="Resume">
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => stopMutation.mutate(c.id)} disabled={isMutating} title="Stop">
                                <Square className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(c.status === 'draft' || c.status === 'paused') && (
                            <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(c.id)} disabled={isMutating} title="Duplicate">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Link
                            href={`/dashboard/campaigns/${c.id}`}
                            className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                            title="Details"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete campaign "${c.name}"?`)) deleteMutation.mutate(c.id)
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
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  )
}
