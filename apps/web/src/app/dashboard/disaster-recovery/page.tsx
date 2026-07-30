'use client'

import { useState } from 'react'
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
  TableSkeleton,
  LoadingState,
  useToast,
  Select,
  Input,
} from '@rds/ui'
import {
  Umbrella,
  RefreshCw,
  Plus,
  Loader2,
  Trash2,
  Play,
  CheckCircle2,
  FileSearch,
} from 'lucide-react'
import type { DisasterRecoveryConfig, BackupVerificationResult } from '@rds/types'

const STRATEGY_LABELS: Record<string, string> = {
  backup_restore: 'Backup & Restore',
  multi_region: 'Multi-Region',
  active_passive: 'Active-Passive',
  active_active: 'Active-Active',
}

function statusVariant(status: string | null): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (status === 'success') return 'success'
  if (status === 'partial') return 'warning'
  if (status === 'failed') return 'danger'
  return 'info'
}

export default function DisasterRecoveryPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isAdmin = user?.roles?.includes('org_admin') || user?.roles?.includes('super_admin')

  const [createOpen, setCreateOpen] = useState(false)
  const [drillId, setDrillId] = useState<string | null>(null)
  const [selectedConfig, setSelectedConfig] = useState<DisasterRecoveryConfig | null>(null)
  const [verification, setVerification] = useState<BackupVerificationResult | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    strategy: 'backup_restore' as DisasterRecoveryConfig['strategy'],
    rpoMinutes: 60,
    rtoMinutes: 120,
    backupScheduleCron: '',
    primaryRegionId: '',
    secondaryRegionId: '',
  })

  const configsQuery = useQuery({
    queryKey: ['dr-configs', orgId],
    queryFn: () => api.listDRConfigs(orgId),
    enabled: !!orgId,
  })

  const createMutation = useMutation({
    mutationFn: () => api.createDRConfig(orgId, {
      ...form,
      description: form.description || null,
      backupScheduleCron: form.backupScheduleCron || null,
      primaryRegionId: form.primaryRegionId || null,
      secondaryRegionId: form.secondaryRegionId || null,
    }),
    onSuccess: () => {
      toast('DR config created', 'success')
      setCreateOpen(false)
      setForm({ name: '', description: '', strategy: 'backup_restore', rpoMinutes: 60, rtoMinutes: 120, backupScheduleCron: '', primaryRegionId: '', secondaryRegionId: '' })
      queryClient.invalidateQueries({ queryKey: ['dr-configs'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to create DR config', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => api.updateDRConfig(orgId, id, patch),
    onSuccess: () => {
      toast('DR config updated', 'success')
      setSelectedConfig(null)
      queryClient.invalidateQueries({ queryKey: ['dr-configs'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to update DR config', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDRConfig(orgId, id),
    onSuccess: () => {
      toast('DR config deleted', 'success')
      queryClient.invalidateQueries({ queryKey: ['dr-configs'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete DR config', 'error'),
  })

  const drillMutation = useMutation({
    mutationFn: (id: string) => api.runDRDrill(orgId, id),
    onSuccess: () => {
      toast('DR drill completed', 'success')
      setDrillId(null)
      queryClient.invalidateQueries({ queryKey: ['dr-configs'] })
    },
    onError: (err: any) => toast(err.message || 'DR drill failed', 'error'),
  })

  const verifyMutation = useMutation({
    mutationFn: () => api.verifyBackups(orgId),
    onSuccess: (data) => {
      setVerification(data.verification)
      toast('Backup verification complete', 'success')
    },
    onError: (err: any) => toast(err.message || 'Verification failed', 'error'),
  })

  if (!orgId) return <LoadingState label="Loading organization…" />

  const configs = configsQuery.data?.configs || []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Umbrella className="h-6 w-6 text-violet-400" /> Disaster Recovery
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Configure recovery strategies, run drills, and verify backup integrity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => verifyMutation.mutate()}>
              <FileSearch className="h-4 w-4 mr-1" /> Verify Backups
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { configsQuery.refetch(); toast('Refreshed', 'info') }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {verification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-violet-400" /> Backup Verification
            </CardTitle>
            <CardDescription>Last verified: {new Date(verification.lastVerifiedAt).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Total Backups" value={verification.totalBackups} />
              <Stat label="Completed" value={verification.completedBackups} variant="success" />
              <Stat label="Failed" value={verification.failedBackups} variant={verification.failedBackups > 0 ? 'danger' : 'default'} />
              <Stat label="Integrity" value={verification.integrityChecksPassed ? 'Passed' : 'Failed'} variant={verification.integrityChecksPassed ? 'success' : 'danger'} />
            </div>
            <div className="mt-4 space-y-1">
              {verification.details.map((detail, idx) => (
                <p key={idx} className="text-xs text-neutral-400 font-mono">{detail}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Recovery Configurations</CardTitle>
              <CardDescription>Disaster recovery plans and their latest drill status.</CardDescription>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New Config
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {configsQuery.isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : configs.length === 0 ? (
            <EmptyState icon={<Umbrella className="h-7 w-7" />} title="No DR configs" description="Create a disaster recovery configuration to get started." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>RPO</TableHead>
                  <TableHead>RTO</TableHead>
                  <TableHead>Last Drill</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-white">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="info">{STRATEGY_LABELS[c.strategy] || c.strategy}</Badge>
                    </TableCell>
                    <TableCell className="text-neutral-300">{c.rpoMinutes}m</TableCell>
                    <TableCell className="text-neutral-300">{c.rtoMinutes}m</TableCell>
                    <TableCell>
                      {c.lastDrillAt ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400">{new Date(c.lastDrillAt).toLocaleDateString()}</span>
                          {c.lastDrillStatus && <Badge variant={statusVariant(c.lastDrillStatus)}>{c.lastDrillStatus}</Badge>}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-500">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDrillId(c.id)} title="Run drill">
                          <Play className="h-4 w-4 text-violet-400" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedConfig(c)} title="Edit">
                          <RefreshCw className="h-4 w-4 text-neutral-400" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this DR config?')) deleteMutation.mutate(c.id) }} title="Delete">
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

      {createOpen && (
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
          <DialogHeader title="New DR Config" onClose={() => setCreateOpen(false)} />
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Strategy</label>
              <Select value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value as DisasterRecoveryConfig['strategy'] })}>
                <option value="backup_restore">Backup & Restore</option>
                <option value="multi_region">Multi-Region</option>
                <option value="active_passive">Active-Passive</option>
                <option value="active_active">Active-Active</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">RPO (minutes)</label>
                <Input type="number" value={String(form.rpoMinutes)} onChange={(e) => setForm({ ...form, rpoMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">RTO (minutes)</label>
                <Input type="number" value={String(form.rtoMinutes)} onChange={(e) => setForm({ ...form, rtoMinutes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Backup Schedule (cron)</label>
              <Input value={form.backupScheduleCron} onChange={(e) => setForm({ ...form, backupScheduleCron: e.target.value })} placeholder="0 0 * * *" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Config
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {selectedConfig && (
        <Dialog open={!!selectedConfig} onClose={() => setSelectedConfig(null)}>
          <DialogHeader title="Edit DR Config" onClose={() => setSelectedConfig(null)} />
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Name</label>
              <Input value={selectedConfig.name} onChange={(e) => setSelectedConfig({ ...selectedConfig, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Strategy</label>
              <Select value={selectedConfig.strategy} onChange={(e) => setSelectedConfig({ ...selectedConfig, strategy: e.target.value as DisasterRecoveryConfig['strategy'] })}>
                <option value="backup_restore">Backup & Restore</option>
                <option value="multi_region">Multi-Region</option>
                <option value="active_passive">Active-Passive</option>
                <option value="active_active">Active-Active</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">RPO (minutes)</label>
                <Input type="number" value={String(selectedConfig.rpoMinutes)} onChange={(e) => setSelectedConfig({ ...selectedConfig, rpoMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">RTO (minutes)</label>
                <Input type="number" value={String(selectedConfig.rtoMinutes)} onChange={(e) => setSelectedConfig({ ...selectedConfig, rtoMinutes: Number(e.target.value) })} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConfig(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ id: selectedConfig.id, patch: selectedConfig })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {drillId && (
        <Dialog open={!!drillId} onClose={() => setDrillId(null)}>
          <DialogHeader title="Run DR Drill" onClose={() => setDrillId(null)} />
          <DialogBody>
            <p className="text-sm text-neutral-300">This will initiate a disaster recovery drill for the selected configuration. The system will verify backup integrity and test restore procedures.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrillId(null)}>Cancel</Button>
            <Button onClick={() => drillMutation.mutate(drillId)} disabled={drillMutation.isPending}>
              {drillMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Drill
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}

function Stat({ label, value, variant }: { label: string; value: number | string; variant?: 'success' | 'danger' | 'default' }) {
  const color = variant === 'success' ? 'text-emerald-400' : variant === 'danger' ? 'text-red-400' : 'text-white'
  return (
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/30">
      <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}
