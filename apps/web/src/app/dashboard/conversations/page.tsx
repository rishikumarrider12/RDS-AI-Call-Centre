'use client'

import { useState } from 'react'
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
  LoadingState,
  useToast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@rds/ui'
import {
  MessageSquareText,
  RefreshCw,
  Loader2,
  PhoneForwarded,
  Zap,
  Activity,
} from 'lucide-react'
import type { AIConversation, ConversationMessage, ConversationSummary } from '@rds/types'

const STATUS_OPTIONS = ['', 'active', 'ended', 'failed', 'transferred']

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active': return 'success'
    case 'ended': return 'info'
    case 'failed': return 'danger'
    case 'transferred': return 'warning'
    default: return 'default'
  }
}

function sentimentVariant(sentiment: string | null): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (sentiment) {
    case 'positive': return 'success'
    case 'negative': return 'danger'
    case 'neutral': return 'info'
    default: return 'default'
  }
}

export default function ConversationsPage() {
  const { toast } = useToast()
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const dashboardQuery = useQuery({
    queryKey: ['conversation-dashboard', orgId],
    queryFn: () => api.getConversationDashboard(),
    enabled: !!orgId,
  })

  const conversationsQuery = useQuery({
    queryKey: ['conversations', orgId, search, status, page],
    queryFn: () =>
      api.listConversations({
        search,
        status: status || undefined,
        page,
        pageSize: 10,
      }),
    enabled: !!orgId,
  })

  const endMutation = useMutation({
    mutationFn: (id: string) => api.endConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation-dashboard'] })
      toast('Conversation ended', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to end conversation', 'error'),
  })

  const summary: ConversationSummary | undefined = dashboardQuery.data?.summary
  const conversations = conversationsQuery.data?.conversations ?? []
  const total = conversationsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 10))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <MessageSquareText className="h-6 w-6 text-violet-400" /> Conversations
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Monitor and manage LLM-powered AI conversations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ['conversations'] }); queryClient.invalidateQueries({ queryKey: ['conversation-dashboard'] }); }} disabled={conversationsQuery.isLoading || dashboardQuery.isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${(conversationsQuery.isLoading || dashboardQuery.isLoading) ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {dashboardQuery.isLoading ? (
        <LoadingState label="Loading dashboard…" />
      ) : dashboardQuery.isError ? (
        <ErrorState message="Failed to load dashboard" onRetry={() => dashboardQuery.refetch()} />
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard icon={<Activity className="h-5 w-5" />} label="Active Conversations" value={String(summary.active)} tone="violet" />
          <StatCard icon={<Zap className="h-5 w-5" />} label="Avg Response Time" value={`${summary.avgResponseTime}ms`} tone="amber" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Token Usage" value={String(summary.tokenUsage)} tone="sky" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Daily Cost" value={`$${summary.dailyCost.toFixed(2)}`} tone="emerald" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Success Rate" value={`${summary.successRate}%`} tone="emerald" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="AI Satisfaction" value={String(summary.aiSatisfaction)} tone="violet" />
        </div>
      ) : null}

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MessageSquareText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by intent or model"
                className="pl-9"
              />
            </div>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="sm:w-40">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === '' ? 'All statuses' : s}</option>
              ))}
            </Select>
          </div>

          {conversationsQuery.isLoading ? (
            <LoadingState label="Loading conversations…" />
          ) : conversationsQuery.isError ? (
            <ErrorState message="Failed to load conversations" onRetry={() => conversationsQuery.refetch()} />
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquareText className="h-7 w-7" />}
              title="No conversations"
              description="Conversations will appear here once calls are connected to AI agents."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/10 backdrop-blur-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.map((c: AIConversation) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs text-neutral-400">{c.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-neutral-300">{c.agentId ? c.agentId.slice(0, 8) : '—'}</TableCell>
                        <TableCell className="text-neutral-300">{c.contactId ? c.contactId.slice(0, 8) : '—'}</TableCell>
                        <TableCell className="text-neutral-300 capitalize">{c.provider}</TableCell>
                        <TableCell className="text-neutral-300">{c.model}</TableCell>
                        <TableCell className="text-neutral-300">{c.intent || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={sentimentVariant(c.sentiment)} className="capitalize">
                            {c.sentiment || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(c.status)} className="capitalize">
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-neutral-400">{fmtDuration(c.startedAt, c.endedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === 'active' && (
                              <>
                                <button type="button" title="End" onClick={() => endMutation.mutate(c.id)} className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 transition-colors">
                                  <PhoneForwarded className="h-4 w-4" />
                                </button>
                                <button type="button" title="Transfer" onClick={() => setSelectedId(c.id)} className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors">
                                  <Zap className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button type="button" title="View" onClick={() => setSelectedId(c.id)} className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors">
                              <MessageSquareText className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <ConversationDetailPanel
          conversationId={selectedId}
          orgId={orgId}
          onClose={() => setSelectedId(null)}
          onAction={() => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
          }}
        />
      )}
    </div>
  )
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'violet' | 'amber' | 'emerald' | 'sky' | 'red' }) {
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

function ConversationDetailPanel({ conversationId, orgId, onClose, onAction }: { conversationId: string; orgId: string; onClose: () => void; onAction: () => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [tab, setTab] = useState('overview')
  const [transferTarget, setTransferTarget] = useState('')

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['conversation', orgId, conversationId],
    queryFn: () => api.getConversation(conversationId),
    enabled: !!conversationId && !!orgId,
  })

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => api.getConversationMessages(conversationId),
    enabled: !!conversationId,
  })

  const conversation = convData?.conversation
  const messages: ConversationMessage[] = messagesData?.messages ?? []

  const endMutation = useMutation({
    mutationFn: () => api.endConversation(conversationId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conversations'] }); onAction(); toast('Ended', 'success'); },
  })

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!transferTarget.trim()) throw new Error('Agent ID required')
      return api.transferConversation(conversationId, transferTarget.trim())
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conversations'] }); onAction(); setTransferTarget(''); toast('Transferred', 'success'); },
    onError: (err: any) => toast(err.message || 'Transfer failed', 'error'),
  })

  return (
    <Dialog open onClose={onClose} className="max-w-5xl">
      <DialogHeader title={`Conversation ${conversationId.slice(0, 8)}`} onClose={onClose} />
      <DialogBody className="space-y-6">
        {convLoading || !conversation ? (
          <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {conversation.status === 'active' && (
                <>
                  <Button variant="destructive" size="sm" onClick={() => endMutation.mutate()} disabled={endMutation.isPending}>End</Button>
                  <div className="flex items-center gap-1">
                    <Input value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)} placeholder="Agent ID" className="w-40" />
                    <Button variant="outline" size="sm" onClick={() => transferMutation.mutate()} disabled={!transferTarget.trim() || transferMutation.isPending}>Transfer</Button>
                  </div>
                </>
              )}
              <Badge variant={statusVariant(conversation.status)} className="capitalize ml-auto">{conversation.status}</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Mini label="Provider" value={conversation.provider} />
              <Mini label="Model" value={conversation.model} />
              <Mini label="Intent" value={conversation.intent || '—'} />
              <Mini label="Sentiment" value={conversation.sentiment || '—'} />
              <Mini label="Started" value={fmtDate(conversation.startedAt)} />
              <Mini label="Ended" value={conversation.endedAt ? fmtDate(conversation.endedAt) : '—'} />
            </div>

            <Tabs defaultValue="overview" value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <EmptyState icon={<Activity className="h-7 w-7" />} title="Conversation Overview" description={`Session ${conversationId.slice(0, 8)} active on ${conversation.model}.`} />
              </TabsContent>
              <TabsContent value="messages">
                {messagesLoading ? (
                  <div className="flex items-center gap-2 text-neutral-500 py-6 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Loading messages…</div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-neutral-500 py-6 text-center">No messages yet.</p>
                ) : (
                  <div className="max-h-80 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 space-y-3">
                    {messages.map((m: ConversationMessage) => (
                      <div key={m.id} className="text-sm">
                        <span className={`font-semibold mr-2 ${
                          m.role === 'assistant' ? 'text-violet-400' : m.role === 'user' ? 'text-emerald-400' : 'text-neutral-500'
                        }`}>{m.role}:</span>
                        <span className="text-neutral-300">{m.content}</span>
                        {m.sentiment && <Badge variant={sentimentVariant(m.sentiment)} className="ml-2 capitalize">{m.sentiment}</Badge>}
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-neutral-200 capitalize truncate">{value}</p>
    </div>
  )
}

function fmtDuration(startedAt: string, endedAt?: string | null): string {
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  const seconds = Math.max(0, Math.round((end - start) / 1000))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
