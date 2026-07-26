'use client'

import { useState, useEffect } from 'react'
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
} from '@rds/ui'
import {
  Server,
  RefreshCw,
  Loader2,
  Cpu,
  MemoryStick,
  Activity,
} from 'lucide-react'
import type { ScalingMetric } from '@rds/types'

export default function ScalingPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [minReplicas, setMinReplicas] = useState('1')
  const [maxReplicas, setMaxReplicas] = useState('10')
  const [targetCpu, setTargetCpu] = useState('60')
  const [targetMemory, setTargetMemory] = useState('70')
  const [scaleUpCooldown, setScaleUpCooldown] = useState('60')
  const [scaleDownCooldown, setScaleDownCooldown] = useState('300')

  const configQuery = useQuery({
    queryKey: ['scaling', 'config', orgId],
    queryFn: () => api.getScalingConfig(),
    enabled: !!orgId,
  })

  const metricsQuery = useQuery({
    queryKey: ['scaling', 'metrics', orgId],
    queryFn: () => api.getScalingMetrics(),
    enabled: !!orgId,
    refetchInterval: 15000,
  })

  const updateConfig = useMutation({
    mutationFn: () =>
      api.updateScalingConfig({
        minReplicas: Number(minReplicas),
        maxReplicas: Number(maxReplicas),
        targetCpuPercent: Number(targetCpu),
        targetMemoryPercent: Number(targetMemory),
        scaleUpCooldownSeconds: Number(scaleUpCooldown),
        scaleDownCooldownSeconds: Number(scaleDownCooldown),
      }),
    onSuccess: () => {
      toast('Scaling config updated', 'success')
      setEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ['scaling', 'config', orgId] })
    },
    onError: (err: any) => toast(err.message || 'Failed to update config', 'error'),
  })

  useEffect(() => {
    if (configQuery.data?.config) {
      const c = configQuery.data.config
      setMinReplicas(String(c.minReplicas))
      setMaxReplicas(String(c.maxReplicas))
      setTargetCpu(String(c.targetCpuPercent))
      setTargetMemory(String(c.targetMemoryPercent))
      setScaleUpCooldown(String(c.scaleUpCooldownSeconds))
      setScaleDownCooldown(String(c.scaleDownCooldownSeconds))
    }
  }, [configQuery.data])

  if (!orgId) return <LoadingState label="Loading organization…" />

  const config = configQuery.data?.config
  const metrics: ScalingMetric[] = metricsQuery.data?.metrics || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Server className="h-6 w-6 text-violet-400" /> Auto Scaling
        </h1>
        <p className="text-sm text-neutral-450 mt-1">
          Configure replica count targets and CPU/memory thresholds for automatic scaling.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant={config ? 'success' : 'warning'}>{config ? 'Config active' : 'No config'}</Badge>
        <Button variant="outline" size="sm" onClick={() => { configQuery.refetch(); metricsQuery.refetch(); toast('Refreshed', 'info') }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {configQuery.isLoading ? (
        <LoadingState label="Loading scaling config…" />
      ) : configQuery.isError ? (
        <ErrorState message={(configQuery.error as any)?.message || 'Failed to load scaling config'} onRetry={() => configQuery.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={<Activity className="h-5 w-5 text-violet-400" />} label="Min Replicas" value={String(config?.minReplicas ?? '—')} />
            <Stat icon={<Server className="h-5 w-5 text-violet-400" />} label="Max Replicas" value={String(config?.maxReplicas ?? '—')} />
            <Stat icon={<Cpu className="h-5 w-5 text-emerald-400" />} label="CPU Target" value={`${config?.targetCpuPercent ?? '—'}%`} />
            <Stat icon={<MemoryStick className="h-5 w-5 text-amber-400" />} label="Memory Target" value={`${config?.targetMemoryPercent ?? '—'}%`} />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>Auto-scaling policy for this organization.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setEditOpen(true)}>Edit</Button>
              </div>
            </CardHeader>
            <CardContent>
              {!config ? (
                <EmptyState icon={<Server className="h-7 w-7" />} title="No configuration" description="Set up auto-scaling to handle variable load." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setting</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="font-medium">Min Replicas</TableCell><TableCell>{config.minReplicas}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Max Replicas</TableCell><TableCell>{config.maxReplicas}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">CPU Target</TableCell><TableCell>{config.targetCpuPercent}%</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Memory Target</TableCell><TableCell>{config.targetMemoryPercent}%</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Scale-Up Cooldown</TableCell><TableCell>{config.scaleUpCooldownSeconds}s</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Scale-Down Cooldown</TableCell><TableCell>{config.scaleDownCooldownSeconds}s</TableCell></TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-400" /> Recent Metrics
              </CardTitle>
              <CardDescription>Latest scaling metrics snapshots.</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <EmptyState icon={<Activity className="h-7 w-7" />} title="No metrics yet" description="Metrics appear once the scaler reports data." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Replicas</TableHead>
                      <TableHead>CPU</TableHead>
                      <TableHead>Memory</TableHead>
                      <TableHead className="text-right">RPS</TableHead>
                      <TableHead>Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.slice(0, 20).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-white font-medium">{m.replicas}</TableCell>
                        <TableCell>
                          <Badge variant={m.cpuPercent > 80 ? 'danger' : m.cpuPercent > 50 ? 'warning' : 'success'}>{m.cpuPercent}%</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.memoryPercent > 80 ? 'danger' : m.memoryPercent > 50 ? 'warning' : 'success'}>{m.memoryPercent}%</Badge>
                        </TableCell>
                        <TableCell className="text-right text-white font-semibold">{m.requestsPerSecond.toFixed(1)}</TableCell>
                        <TableCell className="text-neutral-400">{new Date(m.recordedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogHeader title="Edit Auto Scaling" onClose={() => setEditOpen(false)} />
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Min Replicas</label>
              <Input type="number" min="1" value={minReplicas} onChange={(e) => setMinReplicas(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Max Replicas</label>
              <Input type="number" min="1" value={maxReplicas} onChange={(e) => setMaxReplicas(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">CPU Target (%)</label>
              <Input type="number" min="1" max="100" value={targetCpu} onChange={(e) => setTargetCpu(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Memory Target (%)</label>
              <Input type="number" min="1" max="100" value={targetMemory} onChange={(e) => setTargetMemory(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Scale-Up Cooldown (s)</label>
              <Input type="number" min="0" value={scaleUpCooldown} onChange={(e) => setScaleUpCooldown(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Scale-Down Cooldown (s)</label>
              <Input type="number" min="0" value={scaleDownCooldown} onChange={(e) => setScaleDownCooldown(e.target.value)} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={() => updateConfig.mutate()} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
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
