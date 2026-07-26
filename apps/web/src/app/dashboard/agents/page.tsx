'use client'

import { useState, useMemo } from 'react'
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
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  EmptyState,
  ErrorState,
  LoadingState,
  useToast,
  Input,
  Select,
} from '@rds/ui'
import {
  Bot,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Play,
  Search,
  Pause,
  CheckCircle2,
} from 'lucide-react'
import type { AIAgent } from '@rds/types'

const PAGE_SIZE = 10

export default function AIAgentsPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<AIAgent | null>(null)
  const [testingAgent, setTestingAgent] = useState<AIAgent | null>(null)

  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSystemPrompt, setFormSystemPrompt] = useState('')
  const [formLlmProvider, setFormLlmProvider] = useState<'openai' | 'anthropic' | 'local'>('openai')
  const [formLlmModel, setFormLlmModel] = useState('')
  const [formTtsProvider, setFormTtsProvider] = useState('')
  const [formTtsVoiceId, setFormTtsVoiceId] = useState('')
  const [formSttProvider, setFormSttProvider] = useState('')
  const [formSttModel, setFormSttModel] = useState('')
  const [formTemperature, setFormTemperature] = useState('0.7')
  const [formMaxTokens, setFormMaxTokens] = useState('256')
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'testing'>('active')

  const agentsQuery = useQuery({
    queryKey: ['ai-agents', orgId, search, statusFilter, page],
    queryFn: () =>
      api.listAIAgents({
        search: search || undefined,
        status: statusFilter || undefined,
      }),
    enabled: !!orgId,
  })

  const agents = useMemo(() => agentsQuery.data?.agents || [], [agentsQuery.data])
  const total = agents.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginatedAgents = agents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalActive = agents.filter((a) => a.status === 'active').length
  const totalInactive = agents.filter((a) => a.status === 'inactive').length
  const totalTested = agents.filter((a) => a.lastTestedAt !== null).length

  const createMutation = useMutation({
    mutationFn: (input: any) => api.createAIAgent(input),
    onSuccess: () => {
      toast('AI Agent created', 'success')
      setCreateOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to create AI agent', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => api.updateAIAgent(id, input),
    onSuccess: () => {
      toast('AI Agent updated', 'success')
      setEditOpen(false)
      setEditingAgent(null)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to update AI agent', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAIAgent(id),
    onSuccess: () => {
      toast('AI Agent deleted', 'success')
      setDeleteOpen(false)
      setDeletingAgent(null)
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete AI agent', 'error'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.duplicateAIAgent(id),
    onSuccess: () => {
      toast('AI Agent duplicated', 'success')
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to duplicate AI agent', 'error'),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testAIAgent(id),
    onSuccess: () => {
      toast('AI Agent tested', 'success')
      setTestOpen(false)
      setTestingAgent(null)
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to test AI agent', 'error'),
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-agents'] })
    toast('Refreshed', 'info')
  }

  function openCreate() {
    resetForm()
    setCreateOpen(true)
  }

  function openEdit(agent: AIAgent) {
    setEditingAgent(agent)
    setFormName(agent.name)
    setFormDescription(agent.description || '')
    setFormSystemPrompt(agent.systemPrompt)
    setFormLlmProvider(agent.llmProvider)
    setFormLlmModel(agent.llmModel)
    setFormTtsProvider(agent.ttsProvider)
    setFormTtsVoiceId(agent.ttsVoiceId)
    setFormSttProvider(agent.sttProvider)
    setFormSttModel(agent.sttModel)
    setFormTemperature(String(agent.temperature))
    setFormMaxTokens(String(agent.maxTokens))
    setFormStatus(agent.status)
    setEditOpen(true)
  }

  function openDelete(agent: AIAgent) {
    setDeletingAgent(agent)
    setDeleteOpen(true)
  }

  function openTest(agent: AIAgent) {
    setTestingAgent(agent)
    setTestOpen(true)
  }

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setFormSystemPrompt('')
    setFormLlmProvider('openai')
    setFormLlmModel('')
    setFormTtsProvider('')
    setFormTtsVoiceId('')
    setFormSttProvider('')
    setFormSttModel('')
    setFormTemperature('0.7')
    setFormMaxTokens('256')
    setFormStatus('active')
    setEditingAgent(null)
  }

  const isLoading = agentsQuery.isLoading
  const isError = agentsQuery.isError

  if (isLoading) {
    return <LoadingState label="Loading AI agents…" />
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load AI agents"
        onRetry={handleRefresh}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Bot className="h-6 w-6 text-violet-400" /> AI Agents
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Manage AI voice agents, prompts, and provider configurations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Agent
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Bot className="h-5 w-5 text-violet-400" />} label="Total Agents" value={String(total)} />
        <StatCard icon={<Play className="h-5 w-5 text-emerald-400" />} label="Active" value={String(totalActive)} />
        <StatCard icon={<Pause className="h-5 w-5 text-amber-400" />} label="Inactive" value={String(totalInactive)} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-sky-400" />} label="Tested" value={String(totalTested)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Agents</CardTitle>
              <CardDescription>Configured AI voice agents for your campaigns.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search agents"
                  className="pl-9 sm:w-64"
                />
              </div>
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="sm:w-40">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="testing">Testing</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedAgents.length === 0 ? (
            <EmptyState
              icon={<Bot className="h-7 w-7" />}
              title="No AI agents"
              description="Create your first AI agent to start building intelligent call flows."
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" /> New Agent
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>LLM Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Tested</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium text-white">
                        <div className="flex flex-col">
                          <span>{agent.name}</span>
                          <span className="text-xs text-neutral-500 truncate max-w-xs">{agent.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-300 capitalize">{agent.llmProvider}</TableCell>
                      <TableCell className="text-neutral-400">{agent.llmModel}</TableCell>
                      <TableCell>
                        <Badge variant={agent.status === 'active' ? 'success' : agent.status === 'testing' ? 'warning' : 'default'}>
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-neutral-400">
                        {agent.lastTestedAt ? new Date(agent.lastTestedAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-neutral-400">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openTest(agent)} title="Test">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(agent.id)} title="Duplicate">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(agent)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(agent)} title="Delete">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-4 text-sm text-neutral-400">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      Prev
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen || editOpen} onClose={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }}>
        <DialogHeader title={editingAgent ? 'Edit AI Agent' : 'Create AI Agent'} onClose={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }} />
        <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Name</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Sales Assistant" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Description</label>
            <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">System Prompt</label>
            <textarea
              value={formSystemPrompt}
              onChange={(e) => setFormSystemPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">LLM Provider</label>
              <Select value={formLlmProvider} onChange={(e) => setFormLlmProvider(e.target.value as any)}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="local">Local</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">LLM Model</label>
              <Input value={formLlmModel} onChange={(e) => setFormLlmModel(e.target.value)} placeholder="e.g. gpt-4o-mini" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">TTS Provider</label>
              <Input value={formTtsProvider} onChange={(e) => setFormTtsProvider(e.target.value)} placeholder="e.g. elevenlabs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">TTS Voice ID</label>
              <Input value={formTtsVoiceId} onChange={(e) => setFormTtsVoiceId(e.target.value)} placeholder="e.g. voice-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">STT Provider</label>
              <Input value={formSttProvider} onChange={(e) => setFormSttProvider(e.target.value)} placeholder="e.g. deepgram" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">STT Model</label>
              <Input value={formSttModel} onChange={(e) => setFormSttModel(e.target.value)} placeholder="e.g. nova-2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Temperature</label>
              <Input type="number" step="0.1" min="0" max="2" value={formTemperature} onChange={(e) => setFormTemperature(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Max Tokens</label>
              <Input type="number" min="1" value={formMaxTokens} onChange={(e) => setFormMaxTokens(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Status</label>
              <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="testing">Testing</option>
              </Select>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }}>Cancel</Button>
          <Button
            onClick={() => {
              const input = {
                name: formName,
                description: formDescription || null,
                systemPrompt: formSystemPrompt,
                llmProvider: formLlmProvider,
                llmModel: formLlmModel,
                ttsProvider: formTtsProvider,
                ttsVoiceId: formTtsVoiceId,
                sttProvider: formSttProvider,
                sttModel: formSttModel,
                temperature: Number(formTemperature),
                maxTokens: Number(formMaxTokens),
                status: formStatus,
              }
              if (editingAgent) {
                updateMutation.mutate({ id: editingAgent.id, input })
              } else {
                createMutation.mutate(input)
              }
            }}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeletingAgent(null); }}>
        <DialogHeader title="Delete AI Agent" onClose={() => { setDeleteOpen(false); setDeletingAgent(null); }} />
        <DialogBody>
          <p className="text-sm text-neutral-300">
            Are you sure you want to delete <span className="font-semibold text-white">{deletingAgent?.name}</span>? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeletingAgent(null); }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deletingAgent && deleteMutation.mutate(deletingAgent.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testOpen} onClose={() => { setTestOpen(false); setTestingAgent(null); }}>
        <DialogHeader title="Test AI Agent" onClose={() => { setTestOpen(false); setTestingAgent(null); }} />
        <DialogBody>
          <p className="text-sm text-neutral-300">
            Run a test call for <span className="font-semibold text-white">{testingAgent?.name}</span>? This will mark the agent as tested and log the result.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setTestOpen(false); setTestingAgent(null); }}>Cancel</Button>
          <Button
            onClick={() => testingAgent && testMutation.mutate(testingAgent.id)}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Test'}
          </Button>
        </DialogFooter>
      </Dialog>
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
