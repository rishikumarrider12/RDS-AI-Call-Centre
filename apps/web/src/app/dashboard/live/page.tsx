'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { supabaseBrowser } from '@/lib/supabase'
import type { Call, CallStatus } from '@rds/types'
import { Radio, Loader2, CircleDot, Users, ListChecks, Activity, Wifi, WifiOff, PhoneIncoming } from 'lucide-react'

type ConnState = 'connecting' | 'connected' | 'error'

function mapDbCall(row: any): Call {
  return {
    id: row.id,
    organizationId: row.organization_id,
    campaignId: row.campaign_id ?? null,
    contactId: row.contact_id ?? null,
    agentId: row.agent_id ?? null,
    callQueueId: row.call_queue_id ?? null,
    direction: row.direction,
    status: row.status,
    outcome: row.outcome ?? null,
    provider: row.provider ?? null,
    providerCallSid: row.provider_call_sid ?? null,
    toNumber: row.to_number,
    fromNumber: row.from_number,
    durationSeconds: row.duration_seconds ?? 0,
    billSeconds: row.bill_seconds ?? 0,
    recordingUrl: row.recording_url ?? null,
    recordingDuration: row.recording_duration ?? null,
    cost: row.cost ?? null,
    currency: row.currency ?? null,
    dialAttempt: row.dial_attempt ?? 1,
    startAt: row.start_at ?? null,
    answerAt: row.answer_at ?? null,
    endAt: row.end_at ?? null,
    hangupCause: row.hangup_cause ?? null,
    transcript: row.transcript ?? null,
    summary: row.summary ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const ACTIVE_STATUSES: CallStatus[] = ['queued', 'ringing', 'connected']

export default function LiveDashboardPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const [calls, setCalls] = useState<Call[]>([])
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [conn, setConn] = useState<ConnState>('connecting')
  const channelRef = useRef<any>(null)

  // Initial seed
  useEffect(() => {
    if (!orgId) return
    api.getActiveCalls().then((res) => setCalls(res.calls)).catch(() => {})
    if (supabaseBrowser) {
      supabaseBrowser
        .from('ai_agents')
        .select('id, name')
        .eq('organization_id', orgId)
        .then(
          ({ data }) => setAgents((data as any[]) || []),
          () => {}
        )
    }
  }, [orgId])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!orgId || !supabaseBrowser) {
      setConn(supabaseBrowser ? 'connecting' : 'error')
      return
    }

    const sb = supabaseBrowser
    const channel = sb
      .channel(`live-calls-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls', filter: `organization_id=eq.${orgId}` },
        (payload: any) => {
          setCalls((prev) => {
            const row = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!row?.id) return prev
            const mapped = mapDbCall(row)
            const exists = prev.find((c) => c.id === mapped.id)
            if (payload.eventType === 'DELETE') {
              return prev.filter((c) => c.id !== mapped.id)
            }
            if (exists) {
              return prev.map((c) => (c.id === mapped.id ? mapped : c))
            }
            return [mapped, ...prev]
          })
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') setConn('connected')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConn('error')
        else setConn('connecting')
      })

    channelRef.current = channel
    return () => {
      sb.removeChannel(channel)
      channelRef.current = null
    }
  }, [orgId])

  const activeCalls = calls.filter((c) => ACTIVE_STATUSES.includes(c.status))
  const queued = calls.filter((c) => c.status === 'queued')
  const connected = calls.filter((c) => c.status === 'connected')
  const ringing = calls.filter((c) => c.status === 'ringing')

  const agentStatus = agents.map((a) => {
    const onCall = activeCalls.some((c) => c.agentId === a.id && (c.status === 'connected' || c.status === 'ringing'))
    const count = activeCalls.filter((c) => c.agentId === a.id).length
    return { ...a, onCall, count }
  })

  // Campaign statistics derived from live calls
  const byCampaign = new Map<string, number>()
  activeCalls.forEach((c) => {
    const key = c.campaignName || 'Unassigned'
    byCampaign.set(key, (byCampaign.get(key) ?? 0) + 1)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Radio className="h-6 w-6 text-violet-400" /> Live Dashboard
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Real-time calling operations powered by Supabase Realtime.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {conn === 'connected' ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Wifi className="h-4 w-4" /> Live
            </span>
          ) : conn === 'error' ? (
            <span className="flex items-center gap-1.5 text-red-400">
              <WifiOff className="h-4 w-4" /> Offline
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
            </span>
          )}
        </div>
      </div>

      {!supabaseBrowser && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-600/5 p-4 text-sm text-amber-300">
          Realtime is unavailable: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable live updates.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Activity className="h-5 w-5" />} label="Active Calls" value={activeCalls.length} tone="violet" />
        <StatCard icon={<PhoneIncoming className="h-5 w-5" />} label="In Queue" value={queued.length} tone="amber" />
        <StatCard icon={<CircleDot className="h-5 w-5" />} label="Connected" value={connected.length} tone="emerald" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Ringing" value={ringing.length} tone="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <Panel title="Active Calls" icon={<CircleDot className="h-4 w-4" />}>
            {activeCalls.length === 0 ? (
              <Empty text="No active calls right now." />
            ) : (
              <div className="space-y-2">
                {activeCalls.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{c.contactName || c.toNumber}</p>
                      <p className="text-xs text-neutral-500 font-mono">{c.toNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeDot status={c.status} />
                      <span className="text-xs text-neutral-400 capitalize">{c.direction}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Queue" icon={<ListChecks className="h-4 w-4" />}>
            {queued.length === 0 ? (
              <Empty text="Queue is empty." />
            ) : (
              <div className="space-y-2">
                {queued.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-3">
                    <p className="text-sm font-medium text-white">{c.contactName || c.toNumber}</p>
                    <span className="text-xs text-amber-400">queued</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <section className="space-y-4">
          <Panel title="Agent Status" icon={<Users className="h-4 w-4" />}>
            {agentStatus.length === 0 ? (
              <Empty text="No agents configured." />
            ) : (
              <div className="space-y-2">
                {agentStatus.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-3">
                    <p className="text-sm font-medium text-white">{a.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        a.onCall ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {a.onCall ? `On Call (${a.count})` : 'Idle'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Campaign Statistics" icon={<Activity className="h-4 w-4" />}>
            {byCampaign.size === 0 ? (
              <Empty text="No live campaign activity." />
            ) : (
              <div className="space-y-2">
                {Array.from(byCampaign.entries()).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-3">
                    <p className="text-sm font-medium text-white truncate">{name}</p>
                    <span className="text-xs text-violet-400">{count} active</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
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

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-4">
      <h3 className="text-sm font-semibold text-neutral-300 flex items-center gap-2 mb-3">
        {icon} {title}
      </h3>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-neutral-500 py-4 text-center">{text}</p>
}

function BadgeDot({ status }: { status: string }) {
  const color =
    status === 'connected'
      ? 'bg-emerald-500'
      : status === 'ringing'
      ? 'bg-sky-500'
      : status === 'queued'
      ? 'bg-amber-500'
      : 'bg-neutral-500'
  return (
    <span className="flex items-center gap-1.5 text-xs text-neutral-300 capitalize">
      <span className={`h-2 w-2 rounded-full ${color} ${status === 'connected' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  )
}
