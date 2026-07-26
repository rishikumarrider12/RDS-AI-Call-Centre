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
  Globe2,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Radio,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Building2,
} from 'lucide-react'
import type { Region, OrganizationRegion, RegionHealth, Organization } from '@rds/types'

export default function RegionsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)
  const [deletingRegion, setDeletingRegion] = useState<Region | null>(null)
  const [assigningOrg, setAssigningOrg] = useState<OrganizationRegion | null>(null)
  const [selectedHealthRegion, setSelectedHealthRegion] = useState('')

  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formProvider, setFormProvider] = useState('')
  const [formStatus, setFormStatus] = useState('active')
  const [formIsPrimary, setFormIsPrimary] = useState(false)

  const [assignPrimaryRegion, setAssignPrimaryRegion] = useState('')
  const [assignSecondaryRegion, setAssignSecondaryRegion] = useState('')
  const [assignFailoverEnabled, setAssignFailoverEnabled] = useState(false)

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.listRegions(),
    refetchInterval: 30000,
  })

  const orgRegionsQuery = useQuery({
    queryKey: ['organization-regions'],
    queryFn: () => api.listOrganizationRegions(),
    refetchInterval: 30000,
  })

  const organizationsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.getOrganizations(),
  })

  const regions = useMemo(() => regionsQuery.data?.regions || [], [regionsQuery.data])
  const orgRegions: OrganizationRegion[] = orgRegionsQuery.data?.mappings || []
  const organizations: Organization[] = useMemo(() => organizationsQuery.data || [], [organizationsQuery.data])
  const orgNameMap = useMemo(() => {
    const map = new Map<string, string>()
    organizations.forEach((org) => map.set(org.id, org.name))
    return map
  }, [organizations])

  const healthQuery = useQuery({
    queryKey: ['region-health', selectedHealthRegion],
    queryFn: () => api.getRegionHealth(selectedHealthRegion || undefined),
    enabled: regionsQuery.isSuccess && (!!selectedHealthRegion || regions.length === 0),
    refetchInterval: 30000,
  })

  const health: RegionHealth | undefined = healthQuery.data?.health

  useEffect(() => {
    if (!selectedHealthRegion && regions.length > 0) {
      const primary = regions.find((r) => r.isPrimary)
      setSelectedHealthRegion(primary ? primary.code : regions[0].code)
    }
  }, [regions, selectedHealthRegion])

  useEffect(() => {
    if (editingRegion) {
      setFormCode(editingRegion.code)
      setFormName(editingRegion.name)
      setFormLocation(editingRegion.location)
      setFormProvider(editingRegion.provider)
      setFormStatus(editingRegion.status)
      setFormIsPrimary(editingRegion.isPrimary)
    } else {
      resetForm()
    }
  }, [editingRegion])

  function resetForm() {
    setFormCode('')
    setFormName('')
    setFormLocation('')
    setFormProvider('')
    setFormStatus('active')
    setFormIsPrimary(false)
    setEditingRegion(null)
  }

  function openEdit(region: Region) {
    setEditingRegion(region)
    setCreateOpen(true)
  }

  function openDelete(region: Region) {
    setDeletingRegion(region)
    setDeleteOpen(true)
  }

  function openAssign(mapping: OrganizationRegion) {
    setAssigningOrg(mapping)
    setAssignPrimaryRegion(mapping.primaryRegionId)
    setAssignSecondaryRegion(mapping.secondaryRegionId || '')
    setAssignFailoverEnabled(mapping.failoverEnabled)
    setAssignOpen(true)
  }

  const totalRegions = regions.length
  const healthyRegions = regions.filter((r) => r.status === 'active').length
  const primaryRegionCount = regions.filter((r) => r.isPrimary).length
  const failoverEnabledCount = orgRegions.filter((m) => m.failoverEnabled).length

  const createMutation = useMutation({
    mutationFn: (input: any) => api.createRegion(input),
    onSuccess: () => {
      toast('Region created', 'success')
      setCreateOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['regions'] })
      queryClient.invalidateQueries({ queryKey: ['organization-regions'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to create region', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => api.updateRegion(id, input),
    onSuccess: () => {
      toast('Region updated', 'success')
      setEditOpen(false)
      setEditingRegion(null)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['regions'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to update region', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRegion(id),
    onSuccess: () => {
      toast('Region deleted', 'success')
      setDeleteOpen(false)
      setDeletingRegion(null)
      queryClient.invalidateQueries({ queryKey: ['regions'] })
      queryClient.invalidateQueries({ queryKey: ['organization-regions'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete region', 'error'),
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => api.updateOrganizationRegion(id, input),
    onSuccess: () => {
      toast('Organization regions updated', 'success')
      setAssignOpen(false)
      setAssigningOrg(null)
      queryClient.invalidateQueries({ queryKey: ['organization-regions'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to update organization regions', 'error'),
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['regions'] })
    queryClient.invalidateQueries({ queryKey: ['organization-regions'] })
    queryClient.invalidateQueries({ queryKey: ['organizations'] })
    queryClient.invalidateQueries({ queryKey: ['region-health'] })
    toast('Refreshed', 'info')
  }

  const isLoading = regionsQuery.isLoading || orgRegionsQuery.isLoading
  const isError = regionsQuery.isError || orgRegionsQuery.isError

  if (isLoading) {
    return <LoadingState label="Loading region data…" />
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load region data"
        onRetry={handleRefresh}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Globe2 className="h-6 w-6 text-violet-400" /> Multi-Region Readiness
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Manage cloud regions, organization mappings, and failover configuration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Region
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Globe2 className="h-5 w-5 text-violet-400" />} label="Total Regions" value={String(totalRegions)} />
        <StatCard icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />} label="Healthy Regions" value={String(healthyRegions)} />
        <StatCard icon={<Radio className="h-5 w-5 text-sky-400" />} label="Primary Region" value={String(primaryRegionCount)} />
        <StatCard icon={<Activity className="h-5 w-5 text-amber-400" />} label="Failover Enabled" value={String(failoverEnabledCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regions</CardTitle>
          <CardDescription>Configured cloud regions and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          {regions.length === 0 ? (
            <EmptyState
              icon={<Globe2 className="h-7 w-7" />}
              title="No regions configured"
              description="Add a region to enable multi-region deployment."
              action={
                <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Region
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{region.name}</span>
                        <span className="text-xs text-neutral-500 font-mono">{region.code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-300">{region.provider}</TableCell>
                    <TableCell className="text-neutral-400">{region.location}</TableCell>
                    <TableCell>
                      {region.isPrimary ? (
                        <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Primary</Badge>
                      ) : (
                        <Badge variant="default">Secondary</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={region.status === 'active' ? 'success' : region.status === 'degraded' ? 'warning' : 'danger'}>
                        {region.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">—</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(region)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDelete(region)}>
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

      <Card>
        <CardHeader>
          <CardTitle>Organization Mappings</CardTitle>
          <CardDescription>Primary and secondary region assignments per organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {orgRegions.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-7 w-7" />}
              title="No mappings configured"
              description="Assign regions to organizations to enable failover."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Primary Region</TableHead>
                  <TableHead>Secondary Region</TableHead>
                  <TableHead>Failover</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgRegions.map((mapping) => {
                  const primaryRegion = regions.find((r) => r.id === mapping.primaryRegionId)
                  const secondaryRegion = regions.find((r) => r.id === mapping.secondaryRegionId)
                  return (
                    <TableRow key={mapping.id}>
                      <TableCell className="text-white font-medium">
                        {orgNameMap.get(mapping.organizationId) || mapping.organizationId}
                      </TableCell>
                      <TableCell className="text-neutral-300">
                        {primaryRegion ? `${primaryRegion.name} (${primaryRegion.code})` : '—'}
                      </TableCell>
                      <TableCell className="text-neutral-300">
                        {secondaryRegion ? `${secondaryRegion.name} (${secondaryRegion.code})` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mapping.failoverEnabled ? 'success' : 'default'}>
                          {mapping.failoverEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openAssign(mapping)}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-violet-400" /> Region Health
          </CardTitle>
          <CardDescription>Real-time health and latency for selected region.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-64">
              <label className="text-sm text-neutral-300 mb-1.5 block">Select Region</label>
              <select
                value={selectedHealthRegion}
                onChange={(e) => setSelectedHealthRegion(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.code}>{r.name} ({r.code})</option>
                ))}
              </select>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <p className="text-xs text-neutral-500 mb-1">Latency</p>
                <p className="text-lg font-semibold text-white">
                  {health ? `${health.latency}ms` : '—'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <p className="text-xs text-neutral-500 mb-1">Replication Delay</p>
                <p className="text-lg font-semibold text-white">
                  {health ? `${health.replicationDelay}ms` : '—'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <p className="text-xs text-neutral-500 mb-1">Status</p>
                <p className="text-lg font-semibold text-white">
                  {health ? health.status : '—'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <p className="text-xs text-neutral-500 mb-1">Failover Ready</p>
                <p className="text-lg font-semibold text-white">
                  {health ? (health.failoverReady ? 'Yes' : 'No') : '—'}
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-3">Auto-refresh every 30 seconds</p>
        </CardContent>
      </Card>

      <Dialog open={createOpen || editOpen} onClose={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }}>
        <DialogHeader title={editingRegion ? 'Edit Region' : 'Create Region'} onClose={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Code</label>
            <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. us-east-1" disabled={!!editingRegion} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Name</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. US East (N. Virginia)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Location</label>
              <Input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g. Virginia, USA" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Provider</label>
              <Input value={formProvider} onChange={(e) => setFormProvider(e.target.value)} placeholder="e.g. AWS" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                <option value="active">Active</option>
                <option value="degraded">Degraded</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Primary</label>
              <select
                value={formIsPrimary ? 'true' : 'false'}
                onChange={(e) => setFormIsPrimary(e.target.value === 'true')}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setEditOpen(false); resetForm(); }}>Cancel</Button>
          <Button
            onClick={() => {
              const input = {
                code: formCode,
                name: formName,
                location: formLocation,
                provider: formProvider,
                status: formStatus,
                isPrimary: formIsPrimary,
              }
              if (editingRegion) {
                updateMutation.mutate({ id: editingRegion.id, input })
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

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeletingRegion(null); }}>
        <DialogHeader title="Delete Region" onClose={() => { setDeleteOpen(false); setDeletingRegion(null); }} />
        <DialogBody>
          <p className="text-sm text-neutral-300">
            Are you sure you want to delete <span className="font-semibold text-white">{deletingRegion?.name}</span>? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeletingRegion(null); }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deletingRegion && deleteMutation.mutate(deletingRegion.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={assignOpen} onClose={() => { setAssignOpen(false); setAssigningOrg(null); }}>
        <DialogHeader title="Assign Regions" onClose={() => { setAssignOpen(false); setAssigningOrg(null); }} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Organization</label>
            <input
              type="text"
              value={assigningOrg ? orgNameMap.get(assigningOrg.organizationId) || assigningOrg.organizationId : ''}
              disabled
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Primary Region</label>
            <select
              value={assignPrimaryRegion}
              onChange={(e) => setAssignPrimaryRegion(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            >
              <option value="">Select primary region</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Secondary Region</label>
            <select
              value={assignSecondaryRegion}
              onChange={(e) => setAssignSecondaryRegion(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            >
              <option value="">None</option>
              {regions.filter((r) => r.id !== assignPrimaryRegion).map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-300">Failover Enabled</p>
              <p className="text-xs text-neutral-500">Automatically failover to secondary on primary failure</p>
            </div>
            <input
              type="checkbox"
              checked={assignFailoverEnabled}
              onChange={(e) => setAssignFailoverEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-violet-600 focus:ring-violet-500"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAssignOpen(false); setAssigningOrg(null); }}>Cancel</Button>
          <Button
            onClick={() => assigningOrg && assignMutation.mutate({
              id: assigningOrg.id,
              input: {
                primaryRegionId: assignPrimaryRegion,
                secondaryRegionId: assignSecondaryRegion || null,
                failoverEnabled: assignFailoverEnabled,
              },
            })}
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
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
