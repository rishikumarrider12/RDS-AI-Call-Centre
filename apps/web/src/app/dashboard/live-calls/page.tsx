'use client'

import { useState, useMemo } from 'react'
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
  Dialog,
  DialogHeader,
  DialogBody,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@rds/ui'
import {
  PhoneCall,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PhoneOff,
  Pause,
  PhoneForwarded,
  Mic,
  Activity,
  ListChecks,
  RefreshCw,
  MicOff,
  Phone,
  Timer,
  CircleDot,
  Sparkles,
} from 'lucide-react'
import type { Call, CallStatus, CallTranscriptLine, CallEvent } from '@rds/types'

const STATUS_OPTIONS: Array<CallStatus | ''> = [
  '',
  'queued',
  'ringing',
  'connected',
  'ended',
  'failed',
  'no-answer',
  'busy',
  'paused',
  'transferred',
]
const DIRECTION_OPTIONS: Array<'outbound' | 'inbound' | ''> = ['', 'outbound', 'inbound']
const PAGE_SIZE = 10

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'connected':
      return 'success'
    case 'ended':
      return 'info'
    case 'failed':
    case 'no-answer':
    case 'busy':
      return 'danger'
    case 'ringing':
      return 'info'
    case 'queued':
    case 'paused':
      return 'warning'
    case 'transferred':
      return 'default'
    default:
      return 'default'
  }
}

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

function fmtDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtCost(cost: number | null): string {
  if (cost === null || cost === undefined) return '—'
  return `$${cost.toFixed(2)}`
}

export default function LiveCallsPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [direction, setDirection] = useState<string>('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['calls', orgId, search, status, direction, page],
    queryFn: () =>
      api.listCalls({
        search,
        status: status || undefined,
        direction: (direction as 'outbound' | 'inbound') || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!orgId,
  })

  const activeCalls = (data?.data ?? []).filter((c: Call) =>
    ['queued', 'ringing', 'connected', 'paused', 'transferred'].includes(c.status)
  )
  const waitingCalls = (data?.data ?? []).filter((c: Call) => c.status === 'queued')
  const connectedCalls = (data?.data ?? []).filter((c: Call) => c.status === 'connected')
  const completedCalls = (data?.data ?? []).filter((c: Call) => c.status === 'ended')
  const failedCalls = (data?.data ?? []).filter((c: Call) =>
    ['failed', 'no-answer', 'busy'].includes(c.status)
  )
  const avgDuration = useMemo(() => {
    const durations = (data?.data ?? [])
      .filter((c: Call) => c.durationSeconds > 0)
      .map((c: Call) => c.durationSeconds)
    if (!durations.length) return 0
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  }, [data?.data])

  const endMutation = useMutation({
    mutationFn: (id: string) => api.endCall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls', orgId] })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseCall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls', orgId] })
    },
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-violet-400" /> Live Calls
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Monitor, control and debug AI calling operations in real time.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={<Activity className="h-5 w-5" />} label="Active Calls" value={activeCalls.length} tone="violet" />
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Calls Waiting" value={waitingCalls.length} tone="amber" />
        <StatCard icon={<CircleDot className="h-5 w-5" />} label="Connected" value={connectedCalls.length} tone="emerald" />
        <StatCard icon={<Loader2 className="h-5 w-5" />} label="Completed" value={completedCalls.length} tone="sky" />
        <StatCard icon={<PhoneOff className="h-5 w-5" />} label="Failed" value={failedCalls.length} tone="red" />
        <StatCard icon={<Timer className="h-5 w-5" />} label="Avg Duration" value={fmtDuration(avgDuration)} tone="violet" />
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
                placeholder="Search by number, campaign or agent"
                className="pl-9"
              />
            </div>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="sm:w-44">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === '' ? 'All statuses' : s}
                </option>
              ))}
            </Select>
            <Select value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1) }} className="sm:w-36">
              {DIRECTION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d === '' ? 'All directions' : d}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <TableSkeleton rows={6} cols={9} />
          ) : isError ? (
            <ErrorState
              message={(error as any)?.message || 'Failed to load calls'}
              onRetry={() => refetch()}
            />
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={<PhoneCall className="h-7 w-7" />}
              title="No calls yet"
              description="Active calls will appear here once your campaigns start connecting."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/10 backdrop-blur-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Call ID</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>AI Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Started At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data.map((c: Call) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs text-neutral-400">{c.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-neutral-300">{c.campaignName || '—'}</TableCell>
                        <TableCell className="text-neutral-300">{c.contactName || c.toNumber}</TableCell>
                        <TableCell className="text-neutral-300">{c.agentName || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(c.status)} className="capitalize">
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-neutral-400">{fmtDuration(c.durationSeconds)}</TableCell>
                        <TableCell className="text-neutral-400">{fmtCost(c.cost)}</TableCell>
                        <TableCell className="text-neutral-500 text-xs">{fmtDate(c.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === 'queued' || c.status === 'ringing' || c.status === 'connected' ? (
                              <>
                                <button
                                  type="button"
                                  title="End call"
                                  onClick={() => endMutation.mutate(c.id)}
                                  className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 transition-colors"
                                >
                                  <PhoneOff className="h-4 w-4" />
                                </button>
                                {c.status === 'connected' && (
                                  <button
                                    type="button"
                                    title="Pause"
                                    onClick={() => pauseMutation.mutate(c.id)}
                                    className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:bg-neutral-850 transition-colors"
                                  >
                                    <Pause className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            ) : null}
                            <button
                              type="button"
                              title="View details"
                              onClick={() => setSelectedId(c.id)}
                              className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                            >
                              <Phone className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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
            </>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <CallDetailPanel
          callId={selectedId}
          orgId={orgId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => setSelectedId(null)}
        />
      )}
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
  value: string | number
  tone: 'violet' | 'amber' | 'emerald' | 'sky' | 'red'
}) {
  const tones: Record<string, string> = {
    violet: 'text-violet-400 bg-violet-600/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-600/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-600/10 border-emerald-500/20',
    sky: 'text-sky-400 bg-sky-600/10 border-sky-500/20',
    red: 'text-red-400 bg-red-600/10 border-red-500/20',
  }
  return (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg border ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-[11px] text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

function CallDetailPanel({
  callId,
  orgId,
  activeTab,
  setActiveTab,
  onClose,
}: {
  callId: string
  orgId: string
  activeTab: string
  setActiveTab: (tab: string) => void
  onClose: () => void
}) {
  const { data: callData, isLoading: callLoading } = useQuery({
    queryKey: ['call', orgId, callId],
    queryFn: () => api.getCall(callId),
    enabled: !!callId && !!orgId,
  })

  const { data: transcriptData, isLoading: transcriptLoading } = useQuery({
    queryKey: ['call-transcript', callId],
    queryFn: () => api.getCallTranscript(callId),
    enabled: !!callId,
  })

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['call-events', callId],
    queryFn: () => api.getCallEvents(callId),
    enabled: !!callId,
  })

  const call: Call | undefined = callData?.call
  const transcripts: CallTranscriptLine[] = (transcriptData?.transcript ?? []) as CallTranscriptLine[]
  const events: CallEvent[] = (eventsData?.events ?? []) as CallEvent[]

  return (
    <Dialog open onClose={onClose} className="max-w-5xl">
      <DialogHeader title={`Call ${callId.slice(0, 8)}`} onClose={onClose} />
      <DialogBody className="space-y-6">
        {callLoading || !call ? (
          <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <CallControls call={call} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Mini label="Status" value={call.status} />
              <Mini label="Direction" value={call.direction} />
              <Mini label="Duration" value={fmtDuration(call.durationSeconds)} />
              <Mini label="Campaign" value={call.campaignName || '—'} />
              <Mini label="AI Agent" value={call.agentName || '—'} />
              <Mini label="Contact" value={call.contactName || call.toNumber} />
              <Mini label="From" value={call.fromNumber} />
              <Mini label="To" value={call.toNumber} />
              <Mini label="Cost" value={fmtCost(call.cost)} />
            </div>

            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="events">Event Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                  {call.recordingUrl ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                        <Mic className="h-4 w-4" /> Recording
                      </p>
                      <audio controls src={call.recordingUrl} className="w-full">
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">No recording available.</p>
                  )}
                  {call.summary && (
                    <div className="mt-4 space-y-2 rounded-lg border border-violet-500/20 bg-violet-600/5 p-4">
                      <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" /> AI Summary
                      </p>
                      <p className="text-sm text-neutral-200 whitespace-pre-wrap">{call.summary}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="transcript">
                {transcriptLoading ? (
                  <div className="flex items-center gap-2 text-neutral-500 py-6 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading transcript…
                  </div>
                ) : transcripts.length === 0 ? (
                  <p className="text-sm text-neutral-500 py-6 text-center">No transcript available yet.</p>
                ) : (
                  <div className="max-h-72 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 space-y-2">
                    {transcripts.map((t) => (
                      <div key={t.sequence} className="text-sm">
                        <span
                          className={`font-semibold mr-2 ${
                            t.channel === 'agent' ? 'text-violet-400' : t.channel === 'system' ? 'text-neutral-500' : 'text-emerald-400'
                          }`}
                        >
                          {t.channel}:
                        </span>
                        <span className="text-neutral-300">{t.text}</span>
                        {!t.isFinal && (
                          <span className="ml-2 text-[10px] text-neutral-600">transcribing…</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events">
                {eventsLoading ? (
                  <div className="flex items-center gap-2 text-neutral-500 py-6 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading events…
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-sm text-neutral-500 py-6 text-center">No events recorded yet.</p>
                ) : (
                  <div className="max-h-72 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 space-y-3">
                    {events.map((ev) => (
                      <div key={ev.id} className="flex gap-3 text-sm">
                        <div className="mt-1 flex flex-col items-center">
                          <span className={`h-2 w-2 rounded-full ${eventColor(ev.eventType)}`} />
                          <span className="flex-1 w-px bg-neutral-800 mt-1" />
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-neutral-200 font-medium capitalize">{ev.eventType.replace('_', ' ')}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {new Date(ev.createdAt).toLocaleTimeString()}
                          </p>
                          {Object.keys(ev.payload).length > 0 && (
                            <pre className="mt-2 text-xs text-neutral-400 overflow-auto max-h-24 rounded border border-neutral-800 bg-neutral-900/30 p-2">
                              {JSON.stringify(ev.payload, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogBody>
    </Dialog>
  )
}

function eventColor(eventType: string): string {
  switch (eventType) {
    case 'start':
    case 'answer':
      return 'bg-emerald-500'
    case 'end':
    case 'hangup':
    case 'failed':
    case 'no_answer':
    case 'busy':
      return 'bg-red-500'
    case 'pause':
    case 'hold':
      return 'bg-amber-500'
    case 'resume':
    case 'unhold':
      return 'bg-emerald-500'
    case 'transfer':
      return 'bg-violet-500'
    case 'mute':
      return 'bg-neutral-500'
    case 'unmute':
      return 'bg-sky-500'
    default:
      return 'bg-neutral-500'
  }
}

function CallControls({ call }: { call: Call }) {
  const [transferTarget, setTransferTarget] = useState('')

  const endMutation = useMutation({
    mutationFn: () => api.endCall(call.id),
  })

  const pauseMutation = useMutation({
    mutationFn: () => api.pauseCall(call.id),
  })

  const resumeMutation = useMutation({
    mutationFn: () => api.resumeCall(call.id),
  })

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!transferTarget.trim()) throw new Error('Agent ID required')
      return api.transferCall(call.id, transferTarget.trim())
    },
  })

  const handleTransfer = () => {
    if (!transferTarget.trim()) return
    transferMutation.mutate(undefined, {
      onSuccess: () => setTransferTarget(''),
    })
  }

  const isConnected = call.status === 'connected'
  const isPaused = call.status === 'paused'
  const isRinging = call.status === 'ringing'
  const isQueued = call.status === 'queued'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(isConnected || isRinging || isQueued) && (
        <>
          {isConnected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => endMutation.mutate()}
              disabled={endMutation.isPending}
              className="gap-1.5"
            >
              <PhoneOff className="h-4 w-4" /> End
            </Button>
          )}
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className="gap-1.5"
            >
              <MicOff className="h-4 w-4" /> Hold
            </Button>
          )}
          {isPaused && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="gap-1.5"
            >
              <Mic className="h-4 w-4" /> Resume
            </Button>
          )}
          <div className="flex items-center gap-1">
            <Input
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
              placeholder="Agent ID to transfer"
              className="w-48"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTransfer}
              disabled={!transferTarget.trim()}
              className="gap-1.5 whitespace-nowrap"
            >
              <PhoneForwarded className="h-4 w-4" /> Transfer
            </Button>
          </div>
        </>
      )}
      {isPaused && (
        <span className="text-xs text-amber-400 font-medium px-2 py-1 rounded border border-amber-500/20 bg-amber-500/5">
          On Hold
        </span>
      )}
      {isConnected && (
        <span className="text-xs text-emerald-400 font-medium px-2 py-1 rounded border border-emerald-500/20 bg-emerald-500/5">
          Live
        </span>
      )}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-neutral-200 capitalize truncate">{value}</p>
    </div>
  )
}
