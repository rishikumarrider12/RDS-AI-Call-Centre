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
  Input,
  useToast,
  EmptyState,
  ErrorState,
  TableSkeleton,
  LoadingState,
} from '@rds/ui'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  RefreshCw,
  Server,
  Activity,
  ShieldCheck,
  Settings2,
  Terminal,
  Play,
  Square,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type { SystemResource, LogEntry, ProductionConfigEntry, ServiceControlAction } from '@rds/types'

type Tab = 'overview' | 'deployments' | 'logs' | 'config' | 'controls'

function fmtBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function levelVariant(level: string | number): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  const l = String(level).toLowerCase()
  if (l === 'error' || l === '50') return 'danger'
  if (l === 'warn' || l === '30') return 'warning'
  if (l === 'info' || l === '20') return 'info'
  if (l === 'debug' || l === '10') return 'default'
  return 'info'
}

export default function OperationsPage() {
  const { user } = useSession()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const orgId = user?.organization_id || ''

  const isSuperAdmin = user?.roles?.includes('super_admin')
  const isAdmin = user?.roles?.includes('org_admin') || isSuperAdmin

  const resourcesQuery = useQuery({
    queryKey: ['operations', 'resources', orgId],
    queryFn: () => api.getSystemResources(),
    enabled: !!orgId,
    refetchInterval: 10000,
  })

  const configQuery = useQuery({
    queryKey: ['operations', 'config', orgId],
    queryFn: () => api.getProductionConfig(),
    enabled: !!orgId && isAdmin,
  })

  const controlsQuery = useQuery({
    queryKey: ['operations', 'controls', orgId],
    queryFn: () => api.getServiceControls(),
    enabled: !!orgId && isSuperAdmin,
  })

  const [logLevel, setLogLevel] = useState('')
  const [logSearch, setLogSearch] = useState('')

  const logsFilteredQuery = useQuery({
    queryKey: ['operations', 'logs', orgId, logLevel, logSearch],
    queryFn: () => api.getRecentLogs({ level: logLevel || undefined, search: logSearch || undefined, limit: 100 }),
    enabled: !!orgId,
  })

  const restartMutation = useMutation({
    mutationFn: () => api.restartService(),
    onSuccess: () => {
      toast('Restart signal sent. The service will restart shortly.', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Failed to restart service', 'error')
    },
  })

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/operations/logs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'logs'] })
      toast('Log buffer cleared', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Failed to clear logs', 'error')
    },
  })

  const resource: SystemResource | undefined = resourcesQuery.data?.resources
  const logs: LogEntry[] = logsFilteredQuery.data?.logs || []
  const config: ProductionConfigEntry[] = configQuery.data?.config || []
  const controls: ServiceControlAction[] = controlsQuery.data?.actions || []

  if (!orgId) {
    return <LoadingState label="Loading organization..." />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Terminal className="h-6 w-6 text-violet-400" /> Production Operations
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            System monitoring, logs, configuration, and service controls.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries(); toast('Refreshed', 'info') }}>
          <RefreshCw className="h-4 w-4" /> Refresh All
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-neutral-800">
        {[
          { key: 'overview' as Tab, label: 'Overview' },
          { key: 'deployments' as Tab, label: 'Deployments' },
          { key: 'logs' as Tab, label: 'Logs' },
          { key: 'config' as Tab, label: 'Config' },
          ...(isSuperAdmin ? [{ key: 'controls' as Tab, label: 'Controls' }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={<Cpu className="h-5 w-5 text-violet-400" />} label="CPU Usage" value={`${((resource?.cpuUsage || 0) * 100).toFixed(1)}%`} />
            <Stat icon={<MemoryStick className="h-5 w-5 text-violet-400" />} label="Memory" value={`${((resource?.memoryUsage || 0) * 100).toFixed(1)}%`} sub={resource ? `${fmtBytes(resource.memoryFree)} free` : undefined} />
            <Stat icon={<HardDrive className="h-5 w-5 text-violet-400" />} label="Disk" value={`${((resource?.diskUsage || 0) * 100).toFixed(1)}%`} sub={resource ? `${fmtBytes(resource.diskFree)} free` : undefined} />
            <Stat icon={<Clock className="h-5 w-5 text-violet-400" />} label="Uptime" value={resource ? fmtDuration(resource.uptimeSeconds) : '—'} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={<Server className="h-5 w-5 text-violet-400" />} label="Platform" value={resource?.platform || '—'} />
            <Stat icon={<Server className="h-5 w-5 text-violet-400" />} label="Arch" value={resource?.arch || '—'} />
            <Stat icon={<Activity className="h-5 w-5 text-violet-400" />} label="Hostname" value={resource?.hostname || '—'} />
            <Stat icon={<Activity className="h-5 w-5 text-violet-400" />} label="Load Avg" value={resource?.loadAverage.map((l) => l.toFixed(2)).join(' ') || '—'} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-400" /> Service Health
              </CardTitle>
              <CardDescription>Live dependency checks from the API health endpoint.</CardDescription>
            </CardHeader>
            <CardContent>
              <HealthTable />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'deployments' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-violet-400" /> Deployment Status
            </CardTitle>
            <CardDescription>Recent deployment records and their current status.</CardDescription>
          </CardHeader>
          <CardContent>
            <DeploymentTable />
          </CardContent>
        </Card>
      )}

      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-violet-400" /> Log Viewer
            </CardTitle>
            <CardDescription>Recent application logs with filtering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-64"
              />
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="">All Levels</option>
                <option value="10">Debug</option>
                <option value="20">Info</option>
                <option value="30">Warn</option>
                <option value="50">Error</option>
              </select>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => clearLogsMutation.mutate()}>
                  <Trash2 className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
            {logsFilteredQuery.isLoading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : logsFilteredQuery.isError ? (
              <ErrorState message={(logsFilteredQuery.error as any)?.message || 'Failed to load logs'} onRetry={() => logsFilteredQuery.refetch()} />
            ) : logs.length === 0 ? (
              <EmptyState icon={<Terminal className="h-7 w-7" />} title="No logs yet" description="Log entries appear once the service processes traffic." />
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-neutral-800 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={levelVariant(entry.level)} className="text-[10px]">
                            {String(entry.level)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-neutral-300 font-mono max-w-[600px] truncate">
                          {entry.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'config' && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-violet-400" /> Production Configuration
            </CardTitle>
            <CardDescription>Current environment configuration. Secrets are redacted.</CardDescription>
          </CardHeader>
          <CardContent>
            {configQuery.isLoading ? (
              <TableSkeleton rows={5} cols={3} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="font-mono text-xs text-neutral-300">{entry.key}</TableCell>
                      <TableCell>
                        <span className={entry.redacted ? 'text-red-400' : 'text-neutral-200'}>
                          {entry.value}
                        </span>
                        {entry.redacted && (
                          <Badge variant="danger" className="ml-2 text-[10px]">Redacted</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500">{entry.description || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'controls' && isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-violet-400" /> Service Controls
            </CardTitle>
            <CardDescription>Administrative actions. Restricted to super admins.</CardDescription>
          </CardHeader>
          <CardContent>
            {controlsQuery.isLoading ? (
              <LoadingState label="Loading controls..." />
            ) : (
              <div className="space-y-4">
                {controls.map((ctrl) => (
                  <div key={ctrl.action} className="flex items-center justify-between p-4 border border-neutral-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white capitalize">{ctrl.action}</p>
                      <p className="text-xs text-neutral-400 mt-1">{ctrl.description}</p>
                    </div>
                    <Button
                       variant={ctrl.action === 'restart' ? 'default' : 'destructive'}
                      size="sm"
                      onClick={() => {
                        if (ctrl.action === 'restart') {
                          restartMutation.mutate()
                        }
                      }}
                      disabled={restartMutation.isPending}
                    >
                      {restartMutation.isPending ? (
                        <>
                          <Activity className="h-4 w-4 mr-1 animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          {ctrl.action === 'restart' ? <Play className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                          {ctrl.action === 'restart' ? 'Restart Now' : 'Shutdown'}
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
        {sub && <p className="text-[10px] text-neutral-600">{sub}</p>}
      </div>
    </div>
  )
}

function HealthTable() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => fetch('/api/health').then((r) => r.json()),
    refetchInterval: 15000,
  })

  const components = data?.checks || {}
  const status = data?.status || 'unknown'

  const statusIcon = (s: string) => {
    if (s === 'healthy') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    if (s === 'degraded') return <AlertTriangle className="h-4 w-4 text-yellow-400" />
    if (s === 'down') return <XCircle className="h-4 w-4 text-red-400" />
    return <Activity className="h-4 w-4 text-neutral-400" />
  }

  if (isLoading) return <LoadingState label="Loading health..." />
  if (isError) return <ErrorState message={(error as any)?.message || 'Failed to load health'} onRetry={() => refetch()} />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Component</TableHead>
          <TableHead>Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>
            <Badge variant={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'danger'} className="capitalize">
              {status}
            </Badge>
          </TableCell>
          <TableCell className="font-medium text-white">Overall</TableCell>
          <TableCell className="text-xs text-neutral-400">{Object.keys(components).length} components monitored</TableCell>
        </TableRow>
        {Object.entries(components).map(([key, check]: [string, any]) => (
          <TableRow key={key}>
            <TableCell>{statusIcon(check?.status || 'unknown')}</TableCell>
            <TableCell className="font-medium text-white capitalize">{key}</TableCell>
            <TableCell className="text-xs text-neutral-400">{check?.detail || '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DeploymentTable() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['deployments'],
    queryFn: () => api.listDeployments(),
    refetchInterval: 30000,
  })

  if (isLoading) return <TableSkeleton rows={5} cols={4} />
  if (isError) return <ErrorState message={(error as any)?.message || 'Failed to load deployments'} onRetry={() => refetch()} />

  const deployments = data?.deployments || []

  if (deployments.length === 0) {
    return <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title="No deployments" description="Deployments will appear once recorded." />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deployments.slice(0, 10).map((dep: any) => (
          <TableRow key={dep.id}>
            <TableCell className="font-mono text-sm text-white">{dep.version}</TableCell>
            <TableCell>
              <Badge variant="info" className="capitalize">{dep.environment}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={dep.status === 'success' ? 'success' : dep.status === 'failed' ? 'danger' : 'warning'}>
                {dep.status}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-neutral-500">
              {dep.completedAt ? new Date(dep.completedAt).toLocaleString() : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
