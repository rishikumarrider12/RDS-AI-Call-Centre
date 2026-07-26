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
  Input,
  Select,
} from '@rds/ui'
import {
  Gauge,
  RefreshCw,
  Plus,
  Loader2,
  Trash2,
} from 'lucide-react'

export default function PerformancePage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [endpoint, setEndpoint] = useState('/api/health')
  const [method, setMethod] = useState('GET')
  const [p50Ms, setP50Ms] = useState('')
  const [p95Ms, setP95Ms] = useState('')
  const [p99Ms, setP99Ms] = useState('')
  const [maxConcurrent, setMaxConcurrent] = useState('')

  const baselinesQuery = useQuery({
    queryKey: ['performance', 'baselines', orgId],
    queryFn: () => api.listPerformanceBaselines(),
    enabled: !!orgId,
  })

  const createBaseline = useMutation({
    mutationFn: () =>
      api.createPerformanceBaseline({
        name,
        endpoint,
        method,
        p50Ms: Number(p50Ms),
        p95Ms: Number(p95Ms),
        p99Ms: Number(p99Ms),
        maxConcurrent: maxConcurrent ? Number(maxConcurrent) : null,
      }),
    onSuccess: () => {
      toast('Baseline created', 'success')
      setCreateOpen(false)
      setName('')
      setEndpoint('/api/health')
      setMethod('GET')
      setP50Ms('')
      setP95Ms('')
      setP99Ms('')
      setMaxConcurrent('')
      queryClient.invalidateQueries({ queryKey: ['performance', 'baselines', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to create baseline', 'error'),
  })

  const deleteBaseline = useMutation({
    mutationFn: (id: string) => api.deletePerformanceBaseline(id),
    onSuccess: () => {
      toast('Baseline removed', 'success')
      queryClient.invalidateQueries({ queryKey: ['performance', 'baselines', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete baseline', 'error'),
  })

  if (!orgId) return <LoadingState label="Loading organization…" />

  const baselines = baselinesQuery.data?.baselines || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Gauge className="h-6 w-6 text-violet-400" /> Performance Baselines
        </h1>
        <p className="text-sm text-neutral-450 mt-1">
          Define latency targets for load-testing and performance regression detection.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="info">{baselines.length} baseline(s)</Badge>
        <Button variant="outline" size="sm" onClick={() => { baselinesQuery.refetch(); toast('Refreshed', 'info') }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {baselinesQuery.isLoading ? (
        <LoadingState label="Loading baselines…" />
      ) : baselinesQuery.isError ? (
        <ErrorState message={(baselinesQuery.error as any)?.message || 'Failed to load baselines'} onRetry={() => baselinesQuery.refetch()} />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Endpoints</CardTitle>
                <CardDescription>Latency targets used by load-test runs.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Add Baseline
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {baselines.length === 0 ? (
              <EmptyState icon={<Gauge className="h-7 w-7" />} title="No baselines" description="Add latency targets for your critical endpoints." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>P50</TableHead>
                    <TableHead>P95</TableHead>
                    <TableHead>P99</TableHead>
                    <TableHead>Max Concurrent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baselines.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-white font-medium">{b.name}</TableCell>
                      <TableCell>
                        <Badge variant="default">{b.method}</Badge> <span className="font-mono text-xs text-neutral-300">{b.endpoint}</span>
                      </TableCell>
                      <TableCell className="text-neutral-300">{b.p50Ms}ms</TableCell>
                      <TableCell className="text-neutral-300">{b.p95Ms}ms</TableCell>
                      <TableCell className="text-neutral-300">{b.p99Ms}ms</TableCell>
                      <TableCell className="text-neutral-400">{b.maxConcurrent ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this baseline?')) deleteBaseline.mutate(b.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
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
        <DialogHeader title="New Baseline" onClose={() => setCreateOpen(false)} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Health check" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Endpoint</label>
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="/api/health" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Method</label>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">P50 (ms)</label>
              <Input type="number" value={p50Ms} onChange={(e) => setP50Ms(e.target.value)} placeholder="50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">P95 (ms)</label>
              <Input type="number" value={p95Ms} onChange={(e) => setP95Ms(e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">P99 (ms)</label>
              <Input type="number" value={p99Ms} onChange={(e) => setP99Ms(e.target.value)} placeholder="200" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Max Concurrent (optional)</label>
            <Input type="number" value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} placeholder="100" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={() => createBaseline.mutate()} disabled={createBaseline.isPending || !name || !endpoint || !p50Ms || !p95Ms || !p99Ms}>
            {createBaseline.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
