'use client'

import { useState, type ReactNode } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, Button, useToast } from '@rds/ui'
import { Headphones, Loader2, RefreshCw, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneOff, TrendingUp, Clock, DollarSign, CheckCircle2 } from 'lucide-react'
import type { Call, CallStatus } from '@rds/types'

const ACTIVE: CallStatus[] = ['queued', 'ringing', 'connected']
const MISSED: CallStatus[] = ['no-answer', 'busy', 'failed']

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function AgentDashboardPage() {
  const { user } = useSession()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''
  const [refetchKey, setRefetchKey] = useState(0)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agentCalls', orgId, refetchKey],
    queryFn: () =>
      api.listCalls({
        dateFrom: startOfToday(),
        pageSize: 200,
      }),
    enabled: !!orgId,
  })

  const calls: Call[] = data?.data ?? []

  const todays = calls.length
  const active = calls.filter((c) => ACTIVE.includes(c.status)).length
  const completed = calls.filter((c) => c.status === 'ended').length
  const missed = calls.filter((c) => MISSED.includes(c.status)).length

  const totalDuration = calls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0)
  const connected = calls.filter((c) => c.status === 'connected' || c.outcome === 'completed').length
  const connectRate = todays > 0 ? Math.round((connected / todays) * 100) : 0
  const totalCost = calls.reduce((sum, c) => sum + (typeof c.cost === 'number' ? c.cost : 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Headphones className="h-6 w-6 text-violet-400" /> Agent Dashboard
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Your calling performance for today.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetch()
            setRefetchKey((k) => k + 1)
            toast('Refreshed', 'info')
          }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<PhoneCall className="h-5 w-5" />} label="Today's Calls" value={todays} tone="violet" />
        <Metric icon={<PhoneIncoming className="h-5 w-5" />} label="Active Calls" value={active} tone="emerald" />
        <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={completed} tone="sky" />
        <Metric icon={<PhoneOff className="h-5 w-5" />} label="Missed" value={missed} tone="amber" />
      </div>

      <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider pt-2">Performance</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<TrendingUp className="h-5 w-5" />} label="Connect Rate" value={`${connectRate}%`} tone="violet" />
        <Metric icon={<Clock className="h-5 w-5" />} label="Total Talk Time" value={fmtDuration(totalDuration)} tone="emerald" />
        <Metric icon={<PhoneOutgoing className="h-5 w-5" />} label="Avg / Call" value={todays > 0 ? fmtDuration(Math.round(totalDuration / todays)) : '0m'} tone="sky" />
        <Metric icon={<DollarSign className="h-5 w-5" />} label="Cost" value={`$${totalCost.toFixed(2)}`} tone="amber" />
      </div>

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-10 text-neutral-500">
              <Headphones className="h-10 w-10 mx-auto mb-3 text-neutral-600" />
              No calls recorded today.
            </div>
          ) : (
            <div className="space-y-2">
              {calls.slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{c.contactName || c.toNumber}</p>
                    <p className="text-xs text-neutral-500">{c.campaignName || 'Direct call'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-300 capitalize">{c.status}</p>
                    <p className="text-xs text-neutral-500">{fmtDuration(c.durationSeconds)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number | string
  tone: 'violet' | 'amber' | 'emerald' | 'sky'
}) {
  const tones: Record<string, string> = {
    violet: 'text-violet-400 bg-violet-600/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-600/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-600/10 border-emerald-500/20',
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
