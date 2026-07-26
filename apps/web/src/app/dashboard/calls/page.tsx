'use client'

import { useState } from 'react'
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
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@rds/ui'
import { PhoneCall, Search, ChevronLeft, ChevronRight, Loader2, PlayCircle, Sparkles, Mic } from 'lucide-react'
import type { Call, CallStatus } from '@rds/types'

const STATUS_OPTIONS: Array<CallStatus | ''> = ['', 'queued', 'ringing', 'connected', 'ended', 'failed', 'no-answer', 'busy']
const PAGE_SIZE = 10

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'connected':
    case 'ended':
      return 'success'
    case 'failed':
    case 'no-answer':
    case 'busy':
      return 'danger'
    case 'ringing':
      return 'info'
    case 'queued':
      return 'warning'
    default:
      return 'default'
  }
}

function fmtDuration(seconds: number): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
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

export default function CallsPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [direction, setDirection] = useState<string>('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)

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

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Call History</h1>
        <p className="text-sm text-neutral-450 mt-1">Browse past calls, recordings, transcripts and AI summaries.</p>
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
                placeholder="Search number or SID"
                className="pl-9"
              />
            </div>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="sm:w-40">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === '' ? 'All statuses' : s}
                </option>
              ))}
            </Select>
            <Select value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1) }} className="sm:w-36">
              <option value="">All directions</option>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </Select>
          </div>

          {isLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : isError ? (
            <ErrorState message={(error as any)?.message || 'Failed to load calls'} onRetry={() => refetch()} />
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={<PhoneCall className="h-7 w-7" />}
              title="No calls yet"
              description="Calls will appear here once your campaigns start connecting."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((c: Call) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-white">{c.contactName || '—'}</TableCell>
                    <TableCell className="text-neutral-400 font-mono text-xs">{c.toNumber}</TableCell>
                    <TableCell className="text-neutral-400 capitalize">{c.direction}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)} className="capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">{fmtDuration(c.durationSeconds)}</TableCell>
                    <TableCell className="text-neutral-500 text-xs">{fmtDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => setOpenId(c.id)}
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

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
        </CardContent>
      </Card>

      {openId && <CallDetailsModal callId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function CallDetailsModal({
  callId,
  onClose,
}: {
  callId: string
  onClose: () => void
}) {
  const { user } = useSession()
  const orgId = user?.organization_id || ''

  const { data, isLoading } = useQuery({
    queryKey: ['call', orgId, callId],
    queryFn: () => api.getCall(callId),
    enabled: !!callId,
  })

  const call: Call | undefined = data?.call

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <DialogHeader title="Call Details" onClose={onClose} />
      <DialogBody className="space-y-5">
        {isLoading || !call ? (
          <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Mini label="Status" value={call.status} />
              <Mini label="Direction" value={call.direction} />
              <Mini label="Duration" value={fmtDuration(call.durationSeconds)} />
              <Mini label="Outcome" value={call.outcome || '—'} />
              <Mini label="Campaign" value={call.campaignName || '—'} />
              <Mini label="Agent" value={call.agentName || '—'} />
              <Mini label="From" value={call.fromNumber} />
              <Mini label="To" value={call.toNumber} />
            </div>

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
              <p className="text-xs text-neutral-500">No recording available for this call.</p>
            )}

            {call.summary && (
              <div className="space-y-2 rounded-lg border border-violet-500/20 bg-violet-600/5 p-4">
                <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> AI Summary
                </p>
                <p className="text-sm text-neutral-200 whitespace-pre-wrap">{call.summary}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-400">Transcript</p>
              <div className="max-h-64 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 space-y-2">
                {call.transcriptLines && call.transcriptLines.length > 0 ? (
                  call.transcriptLines.map((line) => (
                    <div key={line.sequence} className="text-sm">
                      <span
                        className={`font-semibold mr-2 ${
                          line.channel === 'agent' ? 'text-violet-400' : line.channel === 'system' ? 'text-neutral-500' : 'text-emerald-400'
                        }`}
                      >
                        {line.channel}:
                      </span>
                      <span className="text-neutral-300">{line.text}</span>
                    </div>
                  ))
                ) : call.transcript ? (
                  <p className="text-sm text-neutral-300 whitespace-pre-wrap">{call.transcript}</p>
                ) : (
                  <p className="text-sm text-neutral-600">No transcript available.</p>
                )}
              </div>
            </div>
          </>
        )}
      </DialogBody>
    </Dialog>
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
