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
  Flag,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Play,
  Pause,
  Building2,
} from 'lucide-react'
import type { FeatureFlag } from '@rds/types'

export default function FeatureFlagsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null)
  const [deletingFlag, setDeletingFlag] = useState<FeatureFlag | null>(null)

  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formEnvironment, setFormEnvironment] = useState<'development' | 'staging' | 'production'>('development')
  const [formOrganizationId, setFormOrganizationId] = useState<string>('')
  const [formRolloutPercentage, setFormRolloutPercentage] = useState('100')
  const [formEnabled, setFormEnabled] = useState(true)

  const [filterEnvironment, setFilterEnvironment] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterOrganizationId, setFilterOrganizationId] = useState<string>('')

  const flagsQuery = useQuery({
    queryKey: ['feature-flags', filterEnvironment, filterStatus, filterOrganizationId],
    queryFn: () =>
      api.listFeatureFlags({
        environment: filterEnvironment || undefined,
        status: filterStatus || undefined,
        organizationId: filterOrganizationId || undefined,
      }),
    refetchInterval: 30000,
  })

  const organizationsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.getOrganizations(),
  })

  const flags = useMemo(() => flagsQuery.data?.flags || [], [flagsQuery.data])
  const organizations = useMemo(() => organizationsQuery.data || [], [organizationsQuery.data])

  const createMutation = useMutation({
    mutationFn: (input: any) => api.createFeatureFlag(input),
    onSuccess: () => {
      toast('Feature flag created', 'success')
      setCreateOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to create feature flag', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => api.updateFeatureFlag(id, input),
    onSuccess: () => {
      toast('Feature flag updated', 'success')
      setEditOpen(false)
      setEditingFlag(null)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to update feature flag', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteFeatureFlag(id),
    onSuccess: () => {
      toast('Feature flag deleted', 'success')
      setDeleteOpen(false)
      setDeletingFlag(null)
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete feature flag', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleFeatureFlag(id),
    onSuccess: () => {
      toast('Feature flag toggled', 'success')
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to toggle feature flag', 'error'),
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    queryClient.invalidateQueries({ queryKey: ['organizations'] })
    toast('Refreshed', 'info')
  }

  const totalFlags = flags.length
  const enabledFlags = flags.filter((f) => f.enabled).length
  const disabledFlags = flags.filter((f) => !f.enabled).length
  const orgsUsingFlags = useMemo(() => {
    const orgIds = new Set(flags.filter((f) => f.organizationId).map((f) => f.organizationId!))
    return orgIds.size
  }, [flags])

  const organizationNameMap = useMemo(() => {
    const map = new Map<string, string>()
    organizations.forEach((org) => map.set(org.id, org.name))
    return map
  }, [organizations])

  useEffect(() => {
    if (editingFlag) {
      setFormName(editingFlag.name)
      setFormDescription(editingFlag.description)
      setFormEnvironment(editingFlag.environment as 'development' | 'staging' | 'production')
      setFormOrganizationId(editingFlag.organizationId || '')
      setFormRolloutPercentage(String(editingFlag.rolloutPercentage))
      setFormEnabled(editingFlag.enabled)
    } else {
      resetForm()
    }
  }, [editingFlag])

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setFormEnvironment('development')
    setFormOrganizationId('')
    setFormRolloutPercentage('100')
    setFormEnabled(true)
    setEditingFlag(null)
  }

  const isLoading = flagsQuery.isLoading
  const isError = flagsQuery.isError

  if (isLoading) {
    return <LoadingState label="Loading feature flags…" />
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load feature flags"
        onRetry={handleRefresh}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Flag className="h-6 w-6 text-violet-400" /> Feature Flags
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Manage gradual rollouts, environment-specific toggles, and organization-level flags.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Create Flag
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Flag className="h-5 w-5 text-violet-400" />} label="Total Flags" value={String(totalFlags)} />
        <StatCard icon={<Play className="h-5 w-5 text-emerald-400" />} label="Enabled Flags" value={String(enabledFlags)} />
        <StatCard icon={<Pause className="h-5 w-5 text-amber-400" />} label="Disabled Flags" value={String(disabledFlags)} />
        <StatCard icon={<Building2 className="h-5 w-5 text-sky-400" />} label="Organizations Using Flags" value={String(orgsUsingFlags)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Refine feature flags by environment, status, or organization.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterEnvironment}
                onChange={(e) => setFilterEnvironment(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                <option value="">All Environments</option>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                <option value="">All Status</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
              <select
                value={filterOrganizationId}
                onChange={(e) => setFilterOrganizationId(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <EmptyState
              icon={<Flag className="h-7 w-7" />}
              title="No feature flags"
              description="Create a feature flag to start controlling rollouts."
              action={
                <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Create Flag
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Rollout %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{flag.name}</span>
                        <span className="text-xs text-neutral-500">{flag.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={flag.environment === 'production' ? 'danger' : flag.environment === 'staging' ? 'warning' : 'default'}>
                        {flag.environment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-300">
                      {flag.organizationId ? organizationNameMap.get(flag.organizationId) || flag.organizationId : 'Global'}
                    </TableCell>
                    <TableCell className="text-right text-white font-semibold">{flag.rolloutPercentage}%</TableCell>
                    <TableCell>
                      <Badge variant={flag.enabled ? 'success' : 'default'}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">
                      {new Date(flag.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate(flag.id)} title={flag.enabled ? 'Disable' : 'Enable'}>
                          {flag.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingFlag(flag); setEditOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeletingFlag(flag); setDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen || editOpen} onClose={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }}>
        <DialogHeader title={editingFlag ? 'Edit Feature Flag' : 'Create Feature Flag'} onClose={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Name</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. new-dashboard-beta" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Description</label>
            <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What this flag controls" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Environment</label>
              <select
                value={formEnvironment}
                onChange={(e) => setFormEnvironment(e.target.value as 'development' | 'staging' | 'production')}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Organization</label>
              <select
                value={formOrganizationId}
                onChange={(e) => setFormOrganizationId(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                <option value="">Global</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Rollout %</label>
              <Input type="number" min="0" max="100" value={formRolloutPercentage} onChange={(e) => setFormRolloutPercentage(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-neutral-300">Enabled</span>
              </label>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }}>Cancel</Button>
          <Button
            onClick={() => {
              const input = {
                name: formName,
                description: formDescription,
                environment: formEnvironment,
                organizationId: formOrganizationId || null,
                rolloutPercentage: Number(formRolloutPercentage),
                enabled: formEnabled,
              }
              if (editingFlag) {
                updateMutation.mutate({ id: editingFlag.id, input })
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

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeletingFlag(null); }}>
        <DialogHeader title="Delete Feature Flag" onClose={() => { setDeleteOpen(false); setDeletingFlag(null); }} />
        <DialogBody>
          <p className="text-sm text-neutral-300">
            Are you sure you want to delete <span className="font-semibold text-white">{deletingFlag?.name}</span>? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeletingFlag(null); }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deletingFlag && deleteMutation.mutate(deletingFlag.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
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

