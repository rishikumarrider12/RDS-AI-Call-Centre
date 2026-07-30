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
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@rds/ui'
import {
  Wrench,
  RefreshCw,
  Plus,
  Loader2,
  Trash2,
  Play,
  Pause,
  CalendarClock,
  Settings2,
  CheckCircle2,
} from 'lucide-react'
import type { MaintenanceWindow, ScheduledJob } from '@rds/types'

const JOB_TYPE_LABELS: Record<string, string> = {
  metrics_cleanup: 'Metrics Cleanup',
  report_generation: 'Report Generation',
  data_retention: 'Data Retention',
  health_check: 'Health Check',
  backup: 'Backup',
  custom: 'Custom',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function jobStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'running') return 'info'
  return 'warning'
}

export default function MaintenancePage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isAdmin = user?.roles?.includes('org_admin') || user?.roles?.includes('super_admin')

  const [windowOpen, setWindowOpen] = useState(false)
  const [jobOpen, setJobOpen] = useState(false)
  const [editingWindow, setEditingWindow] = useState<MaintenanceWindow | null>(null)
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null)

  const [windowForm, setWindowForm] = useState({ title: '', description: '', startsAt: '', endsAt: '', isActive: true })
  const [jobForm, setJobForm] = useState({ name: '', jobType: 'backup' as ScheduledJob['jobType'], cron: '', payload: '{}', isActive: true })

  const windowsQuery = useQuery({
    queryKey: ['maintenance-windows', orgId],
    queryFn: () => api.listMaintenanceWindows(orgId),
    enabled: !!orgId,
  })

  const jobsQuery = useQuery({
    queryKey: ['scheduled-jobs', orgId],
    queryFn: () => api.listScheduledJobs(orgId),
    enabled: !!orgId,
  })

  const createWindowMutation = useMutation({
    mutationFn: () => api.createMaintenanceWindow(orgId, windowForm),
    onSuccess: () => { toast('Maintenance window created', 'success'); setWindowOpen(false); setWindowForm({ title: '', description: '', startsAt: '', endsAt: '', isActive: true }); queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] }) },
    onError: (err: any) => toast(err.message || 'Failed to create maintenance window', 'error'),
  })

  const updateWindowMutation = useMutation({
    mutationFn: () => api.updateMaintenanceWindow(orgId, editingWindow!.id, windowForm),
    onSuccess: () => { toast('Maintenance window updated', 'success'); setEditingWindow(null); queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] }) },
    onError: (err: any) => toast(err.message || 'Failed to update maintenance window', 'error'),
  })

  const deleteWindowMutation = useMutation({
    mutationFn: (id: string) => api.deleteMaintenanceWindow(orgId, id),
    onSuccess: () => { toast('Maintenance window deleted', 'success'); queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] }) },
    onError: (err: any) => toast(err.message || 'Failed to delete maintenance window', 'error'),
  })

  const createJobMutation = useMutation({
    mutationFn: () => api.createScheduledJob(orgId, { ...jobForm, payload: JSON.parse(jobForm.payload || '{}') }),
    onSuccess: () => { toast('Scheduled job created', 'success'); setJobOpen(false); setJobForm({ name: '', jobType: 'backup', cron: '', payload: '{}', isActive: true }); queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] }) },
    onError: (err: any) => toast(err.message || 'Failed to create scheduled job', 'error'),
  })

  const updateJobMutation = useMutation({
    mutationFn: () => api.updateScheduledJob(orgId, editingJob!.id, { ...jobForm, payload: JSON.parse(jobForm.payload || '{}') }),
    onSuccess: () => { toast('Scheduled job updated', 'success'); setEditingJob(null); queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] }) },
    onError: (err: any) => toast(err.message || 'Failed to update scheduled job', 'error'),
  })

  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => api.deleteScheduledJob(orgId, id),
    onSuccess: () => { toast('Scheduled job deleted', 'success'); queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] }) },
    onError: (err: any) => toast(err.message || 'Failed to delete scheduled job', 'error'),
  })

  const toggleJobMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.updateScheduledJob(orgId, id, { isActive }),
    onSuccess: () => { toast('Job updated', 'success'); queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] }) },
    onError: (err: any) => toast(err.message || 'Failed to toggle job', 'error'),
  })

  if (!orgId) return <LoadingState label="Loading organization…" />

  const windows = windowsQuery.data?.windows || []
  const jobs = jobsQuery.data?.jobs || []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Wrench className="h-6 w-6 text-violet-400" /> Maintenance & Scheduling
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage maintenance windows and scheduled background jobs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setJobOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Job
              </Button>
              <Button size="sm" onClick={() => setWindowOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Window
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => { windowsQuery.refetch(); jobsQuery.refetch(); toast('Refreshed', 'info') }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="windows">
        <TabsList>
          <TabsTrigger value="windows">Maintenance Windows</TabsTrigger>
          <TabsTrigger value="jobs">Scheduled Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="windows">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Windows</CardTitle>
              <CardDescription>Scheduled maintenance periods where the system may be unavailable.</CardDescription>
            </CardHeader>
            <CardContent>
              {windowsQuery.isLoading ? (
                <TableSkeleton rows={5} cols={4} />
              ) : windows.length === 0 ? (
                <EmptyState icon={<CalendarClock className="h-7 w-7" />} title="No maintenance windows" description="Schedule a maintenance window to plan downtime." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Starts</TableHead>
                      <TableHead>Ends</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {windows.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium text-white">{w.title}</TableCell>
                        <TableCell className="text-neutral-400">{formatDate(w.startsAt)}</TableCell>
                        <TableCell className="text-neutral-400">{formatDate(w.endsAt)}</TableCell>
                        <TableCell>
                          <Badge variant={w.isActive ? 'success' : 'default'}>{w.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingWindow(w)}>
                              <Settings2 className="h-4 w-4 text-neutral-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this maintenance window?')) deleteWindowMutation.mutate(w.id) }}>
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
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
              <CardDescription>Background jobs for cleanup, reports, health checks, and backups.</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsQuery.isLoading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : jobs.length === 0 ? (
                <EmptyState icon={<Settings2 className="h-7 w-7" />} title="No scheduled jobs" description="Create a scheduled job to automate maintenance tasks." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cron</TableHead>
                      <TableHead>Last Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium text-white">{j.name}</TableCell>
                        <TableCell>
                          <Badge variant="info">{JOB_TYPE_LABELS[j.jobType] || j.jobType}</Badge>
                        </TableCell>
                        <TableCell className="text-neutral-300 font-mono text-xs">{j.cron}</TableCell>
                        <TableCell>
                          <Badge variant={jobStatusVariant(j.lastStatus)}>{j.lastStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => toggleJobMutation.mutate({ id: j.id, isActive: !j.isActive })}>
                              {j.isActive ? <Pause className="h-4 w-4 text-yellow-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingJob(j)}>
                              <Settings2 className="h-4 w-4 text-neutral-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this scheduled job?')) deleteJobMutation.mutate(j.id) }}>
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
        </TabsContent>
      </Tabs>

      {windowOpen && (
        <Dialog open={windowOpen} onClose={() => setWindowOpen(false)}>
          <DialogHeader title="New Maintenance Window" onClose={() => setWindowOpen(false)} />
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Title</label>
              <Input value={windowForm.title} onChange={(e) => setWindowForm({ ...windowForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Description</label>
              <Input value={windowForm.description} onChange={(e) => setWindowForm({ ...windowForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">Starts At</label>
                <Input type="datetime-local" value={windowForm.startsAt} onChange={(e) => setWindowForm({ ...windowForm, startsAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">Ends At</label>
                <Input type="datetime-local" value={windowForm.endsAt} onChange={(e) => setWindowForm({ ...windowForm, endsAt: e.target.value })} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWindowOpen(false)}>Cancel</Button>
            <Button onClick={() => createWindowMutation.mutate()} disabled={createWindowMutation.isPending || !windowForm.title || !windowForm.startsAt || !windowForm.endsAt}>
              {createWindowMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Window
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {editingWindow && (
        <Dialog open={!!editingWindow} onClose={() => setEditingWindow(null)}>
          <DialogHeader title="Edit Maintenance Window" onClose={() => setEditingWindow(null)} />
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Title</label>
              <Input value={editingWindow.title} onChange={(e) => setEditingWindow({ ...editingWindow, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Description</label>
              <Input value={editingWindow.description || ''} onChange={(e) => setEditingWindow({ ...editingWindow, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editingWindow.isActive} onChange={(e) => setEditingWindow({ ...editingWindow, isActive: e.target.checked })} className="rounded border-neutral-700" />
              <label className="text-sm text-neutral-300">Active</label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWindow(null)}>Cancel</Button>
            <Button onClick={() => updateWindowMutation.mutate()} disabled={updateWindowMutation.isPending}>
              {updateWindowMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {jobOpen && (
        <Dialog open={jobOpen} onClose={() => setJobOpen(false)}>
          <DialogHeader title="New Scheduled Job" onClose={() => setJobOpen(false)} />
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Name</label>
              <Input value={jobForm.name} onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Type</label>
              <Select value={jobForm.jobType} onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value as ScheduledJob['jobType'] })}>
                <option value="metrics_cleanup">Metrics Cleanup</option>
                <option value="report_generation">Report Generation</option>
                <option value="data_retention">Data Retention</option>
                <option value="health_check">Health Check</option>
                <option value="backup">Backup</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Cron Schedule</label>
              <Input value={jobForm.cron} onChange={(e) => setJobForm({ ...jobForm, cron: e.target.value })} placeholder="0 0 * * *" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Payload (JSON)</label>
              <Input value={jobForm.payload} onChange={(e) => setJobForm({ ...jobForm, payload: e.target.value })} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobOpen(false)}>Cancel</Button>
            <Button onClick={() => createJobMutation.mutate()} disabled={createJobMutation.isPending || !jobForm.name || !jobForm.cron}>
              {createJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Job
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {editingJob && (
        <Dialog open={!!editingJob} onClose={() => setEditingJob(null)}>
          <DialogHeader title="Edit Scheduled Job" onClose={() => setEditingJob(null)} />
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Name</label>
              <Input value={editingJob.name} onChange={(e) => setEditingJob({ ...editingJob, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Cron Schedule</label>
              <Input value={editingJob.cron} onChange={(e) => setEditingJob({ ...editingJob, cron: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Payload (JSON)</label>
              <Input value={JSON.stringify(editingJob.payload)} onChange={(e) => setEditingJob({ ...editingJob, payload: JSON.parse(e.target.value || '{}') })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editingJob.isActive} onChange={(e) => setEditingJob({ ...editingJob, isActive: e.target.checked })} className="rounded border-neutral-700" />
              <label className="text-sm text-neutral-300">Active</label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingJob(null)}>Cancel</Button>
            <Button onClick={() => updateJobMutation.mutate()} disabled={updateJobMutation.isPending}>
              {updateJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
