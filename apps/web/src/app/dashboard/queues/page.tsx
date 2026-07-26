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
  Workflow,
  RefreshCw,
  Loader2,
  Plus,
  Play,
  Activity,
} from 'lucide-react'
import type { QueueStats } from '@rds/types'

export default function QueuesPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [enqueueOpen, setEnqueueOpen] = useState(false)
  const [jobName, setJobName] = useState('')
  const [jobData, setJobData] = useState('{}')

  const queuesQuery = useQuery({
    queryKey: ['queues'],
    queryFn: () => api.listQueues(),
    refetchInterval: 15000,
  })

  const orgQueueQuery = useQuery({
    queryKey: ['queues', orgId],
    queryFn: () => api.getQueueStats(orgId),
    enabled: !!orgId,
    refetchInterval: 15000,
  })

  const enqueueMutation = useMutation({
    mutationFn: ({ organizationId, name, data }: { organizationId: string; name: string; data: Record<string, unknown> }) =>
      api.enqueueJob(organizationId, name, data),
    onSuccess: () => {
      toast('Job enqueued', 'success')
      setEnqueueOpen(false)
      setJobName('')
      setJobData('{}')
      queryClient.invalidateQueries({ queryKey: ['queues'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to enqueue job', 'error'),
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['queues'] })
    toast('Refreshed', 'info')
  }

  const queues: QueueStats[] = queuesQuery.data?.queues || []
  const orgStats: QueueStats | undefined = orgQueueQuery.data?.stats

  const totalWaiting = queues.reduce((sum, q) => sum + q.waiting, 0)
  const totalActive = queues.reduce((sum, q) => sum + q.active, 0)
  const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0)

  const isLoading = queuesQuery.isLoading || orgQueueQuery.isLoading
  const isError = queuesQuery.isError || orgQueueQuery.isError

  if (isLoading) {
    return <LoadingState label="Loading queue data…" />
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load queue data"
        onRetry={handleRefresh}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Workflow className="h-6 w-6 text-violet-400" /> Queue Partitioning
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Organization-isolated background job processing and queue health.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setEnqueueOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Enqueue Job
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Workflow className="h-5 w-5 text-violet-400" />} label="Total Queues" value={String(queues.length)} />
        <StatCard icon={<Activity className="h-5 w-5 text-sky-400" />} label="Active Jobs" value={String(totalActive)} />
        <StatCard icon={<RefreshCw className="h-5 w-5 text-amber-400" />} label="Waiting Jobs" value={String(totalWaiting)} />
        <StatCard icon={<Play className="h-5 w-5 text-red-400" />} label="Failed Jobs" value={String(totalFailed)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Queue</CardTitle>
          <CardDescription>Current queue statistics for your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {!orgStats ? (
            <EmptyState
              icon={<Workflow className="h-7 w-7" />}
              title="No queue data"
              description="Queue statistics will appear here once jobs are processed."
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <p className="text-xs text-neutral-500 mb-1">Waiting</p>
                <p className="text-lg font-semibold text-white">{orgStats.waiting}</p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <p className="text-xs text-neutral-500 mb-1">Active</p>
                <p className="text-lg font-semibold text-white">{orgStats.active}</p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <p className="text-xs text-neutral-500 mb-1">Completed</p>
                <p className="text-lg font-semibold text-white">{orgStats.completed}</p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <p className="text-xs text-neutral-500 mb-1">Failed</p>
                <p className="text-lg font-semibold text-white">{orgStats.failed}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Queues</CardTitle>
          <CardDescription>Queue statistics across all organizations.</CardDescription>
        </CardHeader>
        <CardContent>
          {queues.length === 0 ? (
            <EmptyState
              icon={<Workflow className="h-7 w-7" />}
              title="No queues"
              description="No queues have been created yet."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue Name</TableHead>
                  <TableHead className="text-right">Waiting</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Delayed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((queue) => (
                  <TableRow key={queue.name}>
                    <TableCell className="text-white font-medium font-mono text-xs">{queue.name}</TableCell>
                    <TableCell className="text-right text-neutral-300">{queue.waiting}</TableCell>
                    <TableCell className="text-right text-neutral-300">{queue.active}</TableCell>
                    <TableCell className="text-right text-emerald-400">{queue.completed}</TableCell>
                    <TableCell className="text-right text-red-400">{queue.failed}</TableCell>
                    <TableCell className="text-right text-neutral-300">{queue.delayed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={enqueueOpen} onClose={() => { setEnqueueOpen(false); setJobName(''); setJobData('{}'); }}>
        <DialogHeader title="Enqueue Job" onClose={() => { setEnqueueOpen(false); setJobName(''); setJobData('{}'); }} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Job Name</label>
            <Input value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="e.g. webhook, notification, cost" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Job Data (JSON)</label>
            <textarea
              value={jobData}
              onChange={(e) => setJobData(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 font-mono"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEnqueueOpen(false); setJobName(''); setJobData('{}'); }}>Cancel</Button>
          <Button
            onClick={() => {
              try {
                const parsed = JSON.parse(jobData)
                enqueueMutation.mutate({ organizationId: orgId, name: jobName, data: parsed })
              } catch {
                toast('Invalid JSON data', 'error')
              }
            }}
            disabled={enqueueMutation.isPending || !jobName}
          >
            {enqueueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enqueue'}
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
