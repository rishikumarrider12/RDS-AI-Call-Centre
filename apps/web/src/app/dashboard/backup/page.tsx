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
  ErrorState,
  LoadingState,
  useToast,
  Select,
} from '@rds/ui'
import {
  Database,
  RefreshCw,
  Plus,
  Loader2,
  Trash2,
  Play,
  RotateCcw,
} from 'lucide-react'
import type { BackupRecord } from '@rds/types'

const TYPE_LABELS: Record<string, string> = {
  full: 'Full',
  schema: 'Schema',
  data: 'Data',
  incremental: 'Incremental',
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function statusVariant(status: BackupRecord['status']): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'running' || status === 'restoring') return 'info'
  if (status === 'pending') return 'warning'
  return 'default'
}

export default function BackupPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [type, setType] = useState<BackupRecord['type']>('full')

  const backupsQuery = useQuery({
    queryKey: ['backups', orgId],
    queryFn: () => api.listBackups({ pageSize: 25 }),
    enabled: !!orgId,
    refetchInterval: 30000,
  })

  const createBackup = useMutation({
    mutationFn: () => api.createBackup(type),
    onSuccess: () => {
      toast('Backup started', 'success')
      setCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['backups', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to start backup', 'error'),
  })

  const restoreBackup = useMutation({
    mutationFn: (id: string) => api.restoreBackup(id),
    onSuccess: () => {
      toast('Restore started', 'info')
      queryClient.invalidateQueries({ queryKey: ['backups', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to restore backup', 'error'),
  })

  const deleteBackup = useMutation({
    mutationFn: (id: string) => api.deleteBackup(id),
    onSuccess: () => {
      toast('Backup deleted', 'success')
      queryClient.invalidateQueries({ queryKey: ['backups', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete backup', 'error'),
  })

  if (!orgId) return <LoadingState label="Loading organization…" />

  const backups = backupsQuery.data?.backups || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Database className="h-6 w-6 text-violet-400" /> Database Backups
        </h1>
        <p className="text-sm text-neutral-450 mt-1">
          Manage automated database backups and point-in-time restores.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="info">{backups.length} backup(s) on record</Badge>
        <Button variant="outline" size="sm" onClick={() => { backupsQuery.refetch(); toast('Refreshed', 'info') }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {backupsQuery.isLoading ? (
        <LoadingState label="Loading backups…" />
      ) : backupsQuery.isError ? (
        <ErrorState message={(backupsQuery.error as any)?.message || 'Failed to load backups'} onRetry={() => backupsQuery.refetch()} />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>Recent database backups for this organization.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New Backup
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <EmptyState icon={<Database className="h-7 w-7" />} title="No backups yet" description="Create a backup to safeguard your data." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-white font-medium">{TYPE_LABELS[b.type] || b.type}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                      </TableCell>
                      <TableCell className="text-neutral-300">{formatBytes(b.sizeBytes)}</TableCell>
                      <TableCell className="text-neutral-400">{formatDate(b.startedAt)}</TableCell>
                      <TableCell className="text-neutral-400">{formatDate(b.completedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={b.status !== 'completed'}
                            onClick={() => restoreBackup.mutate(b.id)}
                          >
                            <RotateCcw className="h-4 w-4 text-emerald-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={b.status === 'restoring'}
                            onClick={() => {
                              if (confirm('Delete this backup? This action cannot be undone.')) deleteBackup.mutate(b.id)
                            }}
                          >
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
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogHeader title="New Backup" onClose={() => setCreateOpen(false)} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Backup Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value as BackupRecord['type'])}>
              <option value="full">Full</option>
              <option value="schema">Schema</option>
              <option value="data">Data</option>
              <option value="incremental">Incremental</option>
            </Select>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={() => createBackup.mutate()} disabled={createBackup.isPending}>
            {createBackup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Backup
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
