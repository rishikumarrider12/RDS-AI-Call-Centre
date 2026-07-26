'use client'

import { useMemo, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Input,
  Select,
  Badge,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
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
import { Boxes, Plus, Loader2, Trash2, Pencil, Link2, Power } from 'lucide-react'
import type { Integration, IntegrationProvider } from '@rds/types'

const CATEGORIES: Record<string, string> = {
  crm: 'CRM',
  messaging: 'Messaging',
  storage: 'Storage',
  analytics: 'Analytics',
  other: 'Other',
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return 'default'
  }
}

export default function IntegrationsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [provider, setProvider] = useState('')
  const [name, setName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['integrations', orgId],
    queryFn: () => api.listIntegrations(),
    enabled: !!orgId,
  })

  const { data: providersData } = useQuery({
    queryKey: ['integrationProviders'],
    queryFn: () => api.listIntegrationProviders(),
    enabled: !!orgId,
  })

  const providers = useMemo<IntegrationProvider[]>(() => providersData?.providers ?? [], [providersData?.providers])
  const integrations = data?.integrations ?? []

  const selectedProvider = useMemo(
    () => providers.find((p) => p.key === provider),
    [providers, provider]
  )

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['integrations', orgId] })

  const reset = () => {
    setProvider('')
    setName('')
    setWebhookUrl('')
    setConfig({})
    setCreateOpen(false)
    setEditId(null)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createIntegration({
        provider,
        name: name.trim() || undefined,
        webhookUrl: webhookUrl.trim() || null,
        config: Object.fromEntries(Object.entries(config).filter(([, v]) => v !== '')),
        status: 'active',
      }),
    onSuccess: () => {
      reset()
      invalidate()
      toast('Integration created', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to create integration', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      api.updateIntegration(id, {
        name: name.trim() || undefined,
        webhookUrl: webhookUrl.trim() || null,
        config: Object.fromEntries(Object.entries(config).filter(([, v]) => v !== '')),
      }),
    onSuccess: () => {
      reset()
      invalidate()
      toast('Integration updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update integration', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteIntegration(id),
    onSuccess: () => {
      invalidate()
      toast('Integration deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete integration', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      api.updateIntegration(id, { status }),
    onSuccess: () => invalidate(),
    onError: (err: any) => toast(err.message || 'Failed to update integration', 'error'),
  })

  const openEdit = (it: Integration) => {
    setProvider(it.provider)
    setName(it.name)
    setWebhookUrl(it.webhookUrl ?? '')
    setConfig((it.config as Record<string, string>) ?? {})
    setEditId(it.id)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Boxes className="h-6 w-6 text-violet-400" /> Integrations
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Connect RDS to CRMs, messaging and analytics tools.</p>
        </div>
        <Button onClick={() => { reset(); setCreateOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Integration
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : isError ? (
            <ErrorState message={(error as any)?.message || 'Failed to load integrations'} onRetry={() => refetch()} />
          ) : integrations.length === 0 ? (
            <EmptyState
              icon={<Boxes className="h-7 w-7" />}
              title="No integrations yet"
              description="Connect RDS to your CRM, messaging or analytics tools to automate workflows."
              action={
                <Button onClick={() => { reset(); setCreateOpen(true) }}>
                  <Plus className="h-4 w-4" /> Add Integration
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((it: Integration) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium text-white">{it.name}</TableCell>
                    <TableCell className="text-neutral-400 capitalize">{it.provider}</TableCell>
                    <TableCell className="text-neutral-400">
                      {CATEGORIES[(it.config?.category as string) || 'other'] ?? 'Other'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(it.status)} className="capitalize">{it.status}</Badge>
                    </TableCell>
                    <TableCell className="text-neutral-500 text-xs">
                      {it.webhookUrl ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <Link2 className="h-3.5 w-3.5" /> Set
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title={it.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() =>
                            toggleMutation.mutate({
                              id: it.id,
                              status: it.status === 'active' ? 'inactive' : 'active',
                            })
                          }
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(it)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Delete integration "${it.name}"?`)) deleteMutation.mutate(it.id)
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
          )}
        </CardContent>
      </Card>

      {(createOpen || editId) && (
        <Dialog open onClose={reset}>
          <DialogHeader title={editId ? 'Edit Integration' : 'Add Integration'} onClose={reset} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Provider</span>
              <Select value={provider} onChange={(e) => { setProvider(e.target.value); setConfig({}) }} disabled={!!editId}>
                <option value="">Select a provider…</option>
                {providers.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </Select>
              {selectedProvider && (
                <span className="text-[11px] text-neutral-500">{selectedProvider.description}</span>
              )}
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Display Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My integration" />
            </label>
            {selectedProvider?.fields.map((field) => (
              <label key={field.key} className="block space-y-2">
                <span className="text-xs font-semibold text-neutral-400">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </span>
                {field.type === 'select' ? (
                  <Select
                    value={config[field.key] ?? ''}
                    onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                    value={config[field.key] ?? ''}
                    onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                    placeholder={field.label}
                  />
                )}
              </label>
            ))}
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Webhook URL (optional)</span>
              <Input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button
              onClick={() => (editId ? updateMutation.mutate(editId) : createMutation.mutate())}
              disabled={createMutation.isPending || updateMutation.isPending || !provider}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{' '}
              {editId ? 'Save Changes' : 'Add'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
