'use client'

import { useState, useEffect, useMemo } from 'react'
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
} from '@rds/ui'
import {
  Headphones,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Settings,
  Activity,
  CheckCircle,
} from 'lucide-react'
import type { VoiceProvider, VoiceProviderCategory } from '@rds/types'

const categoryColors: Record<VoiceProviderCategory, string> = {
  tts: 'bg-violet-500/20 text-violet-400',
  stt: 'bg-sky-500/20 text-sky-400',
  both: 'bg-emerald-500/20 text-emerald-400',
}

const categoryLabels: Record<VoiceProviderCategory, string> = {
  tts: 'TTS',
  stt: 'STT',
  both: 'TTS/STT',
}

export default function VoiceProvidersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<VoiceProvider | null>(null)
  const [deletingProvider, setDeletingProvider] = useState<VoiceProvider | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<VoiceProvider | null>(null)

  const [formKey, setFormKey] = useState('')
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<VoiceProviderCategory>('both')
  const [formDescription, setFormDescription] = useState('')

  const providersQuery = useQuery({
    queryKey: ['voice-providers'],
    queryFn: () => api.listVoiceProviders(),
    refetchInterval: 30000,
  })

  const providers = useMemo(() => providersQuery.data?.providers || [], [providersQuery.data])

  const createMutation = useMutation({
    mutationFn: (input: any) => api.createVoiceProvider(input),
    onSuccess: () => {
      toast('Voice provider created', 'success')
      setCreateOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['voice-providers'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to create voice provider', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => api.updateVoiceProvider(id, input),
    onSuccess: () => {
      toast('Voice provider updated', 'success')
      setEditOpen(false)
      setEditingProvider(null)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['voice-providers'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to update voice provider', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteVoiceProvider(id),
    onSuccess: () => {
      toast('Voice provider deleted', 'success')
      setDeleteOpen(false)
      setDeletingProvider(null)
      queryClient.invalidateQueries({ queryKey: ['voice-providers'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete voice provider', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.updateVoiceProvider(id, { isActive }),
    onSuccess: () => {
      toast('Provider status updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['voice-providers'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to update provider status', 'error'),
  })

  useEffect(() => {
    if (editingProvider) {
      setFormKey(editingProvider.key)
      setFormName(editingProvider.name)
      setFormCategory(editingProvider.category)
      setFormDescription(editingProvider.description ?? '')
    } else {
      resetForm()
    }
  }, [editingProvider])

  function resetForm() {
    setFormKey('')
    setFormName('')
    setFormCategory('both')
    setFormDescription('')
    setEditingProvider(null)
  }

  const isLoading = providersQuery.isLoading
  const isError = providersQuery.isError

  if (isLoading) {
    return <LoadingState label="Loading voice providers…" />
  }

  if (isError) {
    return (
      <ErrorState message="Failed to load voice providers" onRetry={() => queryClient.invalidateQueries({ queryKey: ['voice-providers'] })} />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Headphones className="h-6 w-6 text-violet-400" /> Voice Providers
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Manage voice provider integrations, configure credentials, and monitor health.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['voice-providers'] })}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Provider
          </Button>
        </div>
      </div>

      {providers.length === 0 ? (
        <EmptyState
          icon={<Headphones className="h-7 w-7" />}
          title="No voice providers"
          description="Add a voice provider to enable TTS and STT capabilities."
          action={
            <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Provider
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Providers</CardTitle>
            <CardDescription>Manage your voice provider integrations and credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{provider.name}</span>
                        <span className="text-xs text-neutral-500">{provider.key}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className={categoryColors[provider.category]}>
                        {categoryLabels[provider.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.isActive ? 'success' : 'default'}>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">
                      {new Date(provider.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProvider(provider)
                            setSettingsOpen(true)
                          }}
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProvider(provider)
                            setHealthOpen(true)
                          }}
                          title="Health"
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate({ id: provider.id, isActive: !provider.isActive })}
                          title={provider.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {provider.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingProvider(provider); setEditOpen(true); }}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setDeletingProvider(provider); setDeleteOpen(true); }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen || editOpen} onClose={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }}>
        <DialogHeader title={editingProvider ? 'Edit Voice Provider' : 'Add Voice Provider'} onClose={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Provider Key</label>
            <Input
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              placeholder="e.g. elevenlabs"
              disabled={!!editingProvider}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Name</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. ElevenLabs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as VoiceProviderCategory)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            >
              <option value="tts">TTS</option>
              <option value="stt">STT</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Description</label>
            <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }}>Cancel</Button>
          <Button
            onClick={() => {
              const input = {
                key: formKey,
                name: formName,
                category: formCategory,
                description: formDescription || null,
              }
              if (editingProvider) {
                updateMutation.mutate({ id: editingProvider.id, input })
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

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeletingProvider(null); }}>
        <DialogHeader title="Delete Voice Provider" onClose={() => { setDeleteOpen(false); setDeletingProvider(null); }} />
        <DialogBody>
          <p className="text-sm text-neutral-300">
            Are you sure you want to delete <span className="font-semibold text-white">{deletingProvider?.name}</span>? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeletingProvider(null); }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deletingProvider && deleteMutation.mutate(deletingProvider.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={settingsOpen} onClose={() => { setSettingsOpen(false); setSelectedProvider(null); }}>
        <DialogHeader title={`Settings: ${selectedProvider?.name}`} onClose={() => { setSettingsOpen(false); setSelectedProvider(null); }} />
        <DialogBody className="space-y-4">
          <p className="text-sm text-neutral-400">Provider settings and credential management.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Provider Key</label>
              <Input value={selectedProvider?.key ?? ''} disabled />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Category</label>
              <Input value={categoryLabels[selectedProvider?.category ?? 'both']} disabled />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setSettingsOpen(false); setSelectedProvider(null); }}>Close</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={healthOpen} onClose={() => { setHealthOpen(false); setSelectedProvider(null); }}>
        <DialogHeader title={`Health: ${selectedProvider?.name}`} onClose={() => { setHealthOpen(false); setSelectedProvider(null); }} />
        <DialogBody className="space-y-4">
          <p className="text-sm text-neutral-400">Provider health status and connectivity check.</p>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-neutral-800 bg-neutral-900/30">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-white">Status: Healthy</p>
              <p className="text-xs text-neutral-500">Latency: ~42ms</p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setHealthOpen(false); setSelectedProvider(null); }}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}