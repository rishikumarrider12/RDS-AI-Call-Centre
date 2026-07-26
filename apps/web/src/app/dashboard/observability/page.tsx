'use client'

import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
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
  useToast,
  EmptyState,
  ErrorState,
  TableSkeleton,
  LoadingState,
} from '@rds/ui'
import { Activity, LineChart, Radio, RefreshCw, Cpu, MemoryStick, Clock, AlertTriangle } from 'lucide-react'

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

const HIGHLIGHT = new Set([
  'http_requests_total',
  'http_request_duration_seconds',
  'rds_calls_total',
  'rds_organizations_active',
  'rds_service_up',
  'process_resident_memory_bytes',
  'nodejs_eventloop_lag_seconds',
])

export default function ObservabilityPage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''
  const { toast } = useToast()

  const query = useQuery({
    queryKey: ['observability', 'status', orgId],
    queryFn: () => api.getObservabilityStatus(),
    enabled: !!orgId,
    refetchInterval: 15000,
  })

  if (!orgId) {
    return <LoadingState label="Loading organization…" />
  }

  const metrics = query.data?.metrics || []
  const status = query.data?.status

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Activity className="h-6 w-6 text-violet-400" /> Monitoring &amp; Observability
        </h1>
        <p className="text-sm text-neutral-450 mt-1">
          Traces, metrics and runtime health for the API. Prometheus metrics are exposed at{' '}
          <code className="text-neutral-300">/api/observability/metrics</code>.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-neutral-400">
          <Badge variant={status?.tracingEnabled ? 'success' : 'warning'}>
            {status?.tracingEnabled ? 'Tracing Active' : 'Tracing Local'}
          </Badge>
          <span>Service: {status?.serviceName || 'rds-api'}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => { query.refetch(); toast('Refreshed', 'info') }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : query.isError ? (
        <ErrorState
          message={(query.error as any)?.message || 'Failed to load observability status'}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              icon={<Radio className="h-5 w-5 text-violet-400" />}
              label="Uptime"
              value={fmtDuration(query.data?.uptimeSeconds ?? 0)}
            />
            <Stat
              icon={<LineChart className="h-5 w-5 text-violet-400" />}
              label="Node"
              value={query.data?.nodeVersion ?? '—'}
            />
            <Stat
              icon={<Activity className="h-5 w-5 text-violet-400" />}
              label="Requests"
              value={metrics.find((m: any) => m.name === 'http_requests_total')?.value ?? 0}
            />
            <Stat
              icon={<Radio className="h-5 w-5 text-emerald-400" />}
              label="Service"
              value={metrics.find((m: any) => m.name === 'rds_service_up')?.value ?? '—'}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              icon={<Cpu className="h-5 w-5 text-violet-400" />}
              label="CPU Usage"
              value={metrics.find((m: any) => m.name === 'process_cpu_seconds_total') ? 'Active' : 'N/A'}
            />
            <Stat
              icon={<MemoryStick className="h-5 w-5 text-violet-400" />}
              label="Memory"
              value={formatBytes(metrics.find((m: any) => m.name === 'process_resident_memory_bytes')?.value ?? 0)}
            />
            <Stat
              icon={<Clock className="h-5 w-5 text-violet-400" />}
              label="Event Loop Lag"
              value={`${(metrics.find((m: any) => m.name === 'nodejs_eventloop_lag_seconds')?.value ?? 0).toFixed(3)}s`}
            />
            <Stat
              icon={<AlertTriangle className="h-5 w-5 text-violet-400" />}
              label="Calls Total"
              value={metrics.find((m: any) => m.name === 'rds_calls_total')?.value ?? 0}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-violet-400" /> Key Metrics
              </CardTitle>
              <CardDescription>Live Prometheus metrics scraped from the API process.</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <EmptyState icon={<LineChart className="h-7 w-7" />} title="No metrics yet" description="Metrics appear once the service processes traffic." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m: any) => (
                      <TableRow key={m.name}>
                        <TableCell className={`font-mono text-xs ${HIGHLIGHT.has(m.name) ? 'text-violet-300' : 'text-neutral-300'}`}>
                          {m.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{m.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-white">{formatMetric(m)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function formatMetric(m: any): string {
  const v = typeof m.value === 'number' ? m.value : 0
  if (m.name.includes('bytes')) return `${formatBytes(v)}`
  if (m.name.includes('duration') || m.name.includes('lag')) return `${v.toFixed(3)}s`
  if (m.name.includes('percent') || m.name.includes('ratio')) return `${(v * 100).toFixed(2)}%`
  return v.toLocaleString()
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
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
