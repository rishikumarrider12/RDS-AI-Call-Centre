'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
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
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Skeleton,
  useToast,
} from '@rds/ui'
import {
  PhoneCall,
  Phone,
  Search,
  RefreshCw,
  Pause,
  Play,
  Users,
  Timer,
  Activity,
  TrendingUp,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Radio,
  AlertTriangle,
} from 'lucide-react'
import type { ActiveCall, LiveEvent } from '@rds/types'

const AUTO_REFRESH_INTERVAL = 5000
const PAGE_SIZE = 10

type TabValue = 'overview' | 'active-calls' | 'queues' | 'agents'

function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'connected': return 'success'
    case 'ended': return 'info'
    case 'failed': case 'no-answer': case 'busy': return 'danger'
    case 'ringing': return 'info'
    case 'queued': case 'paused': return 'warning'
    case 'transferred': return 'default'
    default: return 'default'
  }
}

export default function LiveMonitorPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const [tab, setTab] = useState<TabValue>('overview')
  const [paused, setPaused] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['live-dashboard-stats', orgId],
    queryFn: () => api.getLiveDashboardStats().then((r) => r.stats),
    enabled: !!orgId && tab === 'overview',
    refetchInterval: paused ? false : AUTO_REFRESH_INTERVAL,
  })

  const { data: callsData, isLoading: callsLoading, isError: callsError, refetch: refetchCalls } = useQuery({
    queryKey: ['live-active-calls', orgId, statusFilter],
    queryFn: () => api.getLiveActiveCalls(statusFilter ? { status: statusFilter } : undefined).then((r) => r.calls),
    enabled: !!orgId && tab === 'active-calls',
    refetchInterval: paused ? false : AUTO_REFRESH_INTERVAL,
  })

  const { data: queuesData, isLoading: queuesLoading, isError: queuesError, refetch: refetchQueues } = useQuery({
    queryKey: ['live-queues', orgId],
    queryFn: () => api.getLiveQueueStatus().then((r) => r.queues),
    enabled: !!orgId && tab === 'queues',
    refetchInterval: paused ? false : AUTO_REFRESH_INTERVAL,
  })

  const { data: agentsData, isLoading: agentsLoading, isError: agentsError, refetch: refetchAgents } = useQuery({
    queryKey: ['live-agents', orgId],
    queryFn: () => api.getLiveAgentStatus().then((r) => r.agents),
    enabled: !!orgId && tab === 'agents',
    refetchInterval: paused ? false : AUTO_REFRESH_INTERVAL,
  })

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['live-events', orgId],
    queryFn: () => api.getLiveEvents({ limit: 20 }).then((r) => r.events),
    enabled: !!orgId,
    refetchInterval: paused ? false : AUTO_REFRESH_INTERVAL,
  })

  const { data: volumeData } = useQuery({
    queryKey: ['live-volume', orgId],
    queryFn: () => api.getLiveCallVolume({ hours: 24 }).then((r) => r.volume),
    enabled: !!orgId && tab === 'overview',
    refetchInterval: paused ? false : 30000,
  })

  const refreshAll = useCallback(() => {
    refetchStats()
    refetchCalls()
    refetchQueues()
    refetchAgents()
    toast('Refreshed', 'info')
  }, [refetchStats, refetchCalls, refetchQueues, refetchAgents, toast])

  const filteredCalls = useMemo(() => {
    if (!callsData) return []
    if (!search.trim()) return callsData
    const term = search.toLowerCase()
    return callsData.filter((c: ActiveCall) =>
      c.toNumber.includes(term) ||
      c.fromNumber.includes(term) ||
      c.status.toLowerCase().includes(term)
    )
  }, [callsData, search])

  const exportMetrics = useCallback(async () => {
    try {
      const csv = 'timestamp,metric,value\n' + (volumeData || []).map((v) => `${v.timestamp},calls_per_minute,${v.value}`).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `live-metrics-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast('Metrics exported', 'success')
    } catch {
      toast('Export failed', 'error')
    }
  }, [volumeData, toast])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Radio className="h-6 w-6 text-violet-400" /> Live Monitor
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Real-time call center operations dashboard.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused((p) => !p)}
            className="gap-2"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={callsLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${callsLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportMetrics} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={<PhoneCall className="h-5 w-5" />} label="Active Calls" value={stats?.activeCalls ?? 0} tone="violet" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Waiting" value={stats?.waitingCalls ?? 0} tone="amber" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Connected Agents" value={stats?.connectedAgents ?? 0} tone="emerald" />
        <StatCard icon={<Timer className="h-5 w-5" />} label="Avg Duration" value={fmtDuration(stats?.avgCallDuration ?? 0)} tone="sky" />
        <StatCard icon={<Activity className="h-5 w-5" />} label="Calls Today" value={stats?.callsToday ?? 0} tone="violet" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Queue Health" value={`${stats?.queueHealth ?? 0}%`} tone="emerald" />
      </div>

      <div className="flex items-center gap-2 border-b border-neutral-800">
        {(['overview', 'active-calls', 'queues', 'agents'] as TabValue[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'text-violet-400 border-b-2 border-violet-500' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          volumeData={volumeData}
          eventsData={eventsData}
          eventsLoading={eventsLoading}
          onViewCall={(callId) => setSelectedCallId(callId)}
        />
      )}

      {tab === 'active-calls' && (
        <ActiveCallsTab
          calls={filteredCalls}
          loading={callsLoading}
          error={callsError}
          search={search}
          status={statusFilter}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onRefresh={refetchCalls}
          onViewCall={(callId) => setSelectedCallId(callId)}
        />
      )}

      {tab === 'queues' && (
        <QueuesTab
          queues={queuesData || []}
          loading={queuesLoading}
          error={queuesError}
          onRefresh={refetchQueues}
        />
      )}

      {tab === 'agents' && (
        <AgentsTab
          agents={agentsData || []}
          loading={agentsLoading}
          error={agentsError}
          onRefresh={refetchAgents}
        />
      )}

      {selectedCallId && (
        <CallDetailDrawer
          callId={selectedCallId}
          onClose={() => setSelectedCallId(null)}
        />
      )}
    </div>
  )
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  const tones: Record<string, string> = {
    violet: 'text-violet-400 bg-violet-600/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-600/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-600/10 border-emerald-500/20',
    sky: 'text-sky-400 bg-sky-600/10 border-sky-500/20',
  }
  return (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg border ${tones[tone] || tones.violet}`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-[11px] text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

function OverviewTab({
  volumeData,
  eventsData,
  eventsLoading,
  onViewCall,
}: {
  volumeData: Array<{ timestamp: string; value: number }> | undefined
  eventsData: LiveEvent[] | undefined
  eventsLoading: boolean
  onViewCall: (callId: string) => void
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Call Volume (Last 24 Hours)</h3>
          {volumeData && volumeData.length > 0 ? (
            <div className="h-48 flex items-end gap-1 overflow-hidden">
              {volumeData.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-violet-600/60 hover:bg-violet-500/80 transition-colors rounded-t"
                  style={{ height: `${Math.max(4, (v.value / Math.max(1, ...volumeData.map((x) => x.value))) * 100)}%` }}
                  title={`${new Date(v.timestamp).toLocaleTimeString()}: ${v.value} calls`}
                />
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-500 text-sm">No volume data yet</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Live Event Stream</h3>
          {eventsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : eventsData && eventsData.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-auto">
              {eventsData.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-2">
                  <div className={`h-2 w-2 rounded-full ${ev.severity === 'error' ? 'bg-red-500' : ev.severity === 'warning' ? 'bg-amber-500' : 'bg-violet-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 capitalize truncate">{ev.eventType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-neutral-500">{fmtTime(ev.createdAt)}</p>
                  </div>
                  {ev.callId && (
                    <Button variant="ghost" size="sm" onClick={() => onViewCall(ev.callId as string)}>
                      <Phone className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Radio className="h-7 w-7" />} title="No events yet" description="Live events will appear here as calls progress." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ActiveCallsTab({
  calls,
  loading,
  error,
  search,
  status,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onViewCall,
}: {
  calls: ActiveCall[]
  loading: boolean
  error: boolean
  search: string
  status: string
  onSearchChange: (v: string) => void
  onStatusChange: (v: string) => void
  onRefresh: () => void
  onViewCall: (id: string) => void
}) {
  const STATUS_OPTIONS = ['', 'queued', 'ringing', 'connected', 'paused', 'transferred', 'ended', 'failed', 'no-answer', 'busy']
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(calls.length / PAGE_SIZE))
  const paginated = calls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input value={search} onChange={(e) => { onSearchChange(e.target.value); setPage(1) }} placeholder="Search by number..." className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => { onStatusChange(e.target.value); setPage(1) }} className="sm:w-44">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === '' ? 'All statuses' : s}</option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : error ? (
          <ErrorState message="Failed to load active calls" onRetry={onRefresh} />
        ) : paginated.length === 0 ? (
          <EmptyState icon={<PhoneCall className="h-7 w-7" />} title="No active calls" description="Active calls will appear here in real time." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call ID</TableHead>
                    <TableHead>To Number</TableHead>
                    <TableHead>From Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-neutral-400">{c.callId.slice(0, 8)}</TableCell>
                      <TableCell className="text-neutral-300 font-mono text-xs">{c.toNumber}</TableCell>
                      <TableCell className="text-neutral-300 font-mono text-xs">{c.fromNumber}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status)} className="capitalize">{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-neutral-400">{fmtDuration(c.durationSeconds)}</TableCell>
                      <TableCell className="text-neutral-500 text-xs">{fmtTime(c.startedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onViewCall(c.callId)}>
                          <Phone className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function QueuesTab({
  queues,
  loading,
  error,
  onRefresh,
}: {
  queues: Array<{ id: string | null; name: string; waiting: number; active: number; completed: number; abandoned: number; avgWaitSeconds: number; maxWaitSeconds: number; updatedAt: string }>
  loading: boolean
  error: boolean
  onRefresh: () => void
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Queue Status</h3>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : error ? (
          <ErrorState message="Failed to load queue status" onRetry={onRefresh} />
        ) : queues.length === 0 ? (
          <EmptyState icon={<Radio className="h-7 w-7" />} title="No queues configured" description="Queue metrics will appear here when available." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queues.map((q) => (
              <div key={q.id || q.name} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white truncate">{q.name}</h4>
                  <Badge variant={q.waiting > 0 ? 'warning' : 'success'}>{q.waiting} waiting</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-center">
                    <p className="text-lg font-bold text-white">{q.active}</p>
                    <p className="text-[10px] text-neutral-500">Active</p>
                  </div>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-center">
                    <p className="text-lg font-bold text-white">{q.completed}</p>
                    <p className="text-[10px] text-neutral-500">Completed</p>
                  </div>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-center">
                    <p className="text-lg font-bold text-red-400">{q.abandoned}</p>
                    <p className="text-[10px] text-neutral-500">Abandoned</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Avg wait: {q.avgWaitSeconds}s</span>
                  <span>Max: {q.maxWaitSeconds}s</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AgentsTab({
  agents,
  loading,
  error,
  onRefresh,
}: {
  agents: Array<{ id: string; status: string; activeCalls: number; completedCalls: number; failedCalls: number; totalTalkSeconds: number; utilization: number; lastActivityAt: string | null; currentCallId: string | null }>
  loading: boolean
  error: boolean
  onRefresh: () => void
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Agent Status</h3>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : error ? (
          <ErrorState message="Failed to load agent status" onRetry={onRefresh} />
        ) : agents.length === 0 ? (
          <EmptyState icon={<Users className="h-7 w-7" />} title="No agent sessions" description="Agent activity will appear here when agents are online." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active Calls</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs text-neutral-400">{a.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === 'busy' ? 'success' : a.status === 'paused' ? 'warning' : 'default'} className="capitalize">
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-300">{a.activeCalls}</TableCell>
                    <TableCell className="text-neutral-300">{a.completedCalls}</TableCell>
                    <TableCell className="text-neutral-300">{a.utilization}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CallDetailDrawer({ callId, onClose }: { callId: string; onClose: () => void }) {
  const { data: callData, isLoading } = useQuery({
    queryKey: ['call', callId],
    queryFn: () => api.getCall(callId),
    enabled: !!callId,
  })

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <DialogHeader title={`Call ${callId.slice(0, 8)}`} onClose={onClose} />
      <DialogBody>
        {isLoading ? (
          <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : callData?.call ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Status" value={callData.call.status} />
              <Detail label="Direction" value={callData.call.direction} />
              <Detail label="Duration" value={fmtDuration(callData.call.durationSeconds)} />
              <Detail label="From" value={callData.call.fromNumber} />
              <Detail label="To" value={callData.call.toNumber} />
              <Detail label="Cost" value={callData.call.cost ? `$${callData.call.cost.toFixed(2)}` : '—'} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 text-center py-6">Call details not available.</p>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-neutral-200 capitalize truncate">{value}</p>
    </div>
  )
}
