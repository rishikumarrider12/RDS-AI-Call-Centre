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
  ErrorState,
  TableSkeleton,
} from '@rds/ui'
import { Activity, RefreshCw, Server, Database, Radio, HardDrive, Brain, Phone, Plug } from 'lucide-react'

const COMPONENTS: Array<{ key: string; label: string; icon: React.ReactNode }> = [
  { key: 'database', label: 'Database', icon: <Database className="h-5 w-5 text-violet-400" /> },
  { key: 'redis', label: 'Redis', icon: <Radio className="h-5 w-5 text-violet-400" /> },
  { key: 'queue', label: 'Queue Workers', icon: <Server className="h-5 w-5 text-violet-400" /> },
  { key: 'api', label: 'API', icon: <Activity className="h-5 w-5 text-violet-400" /> },
  { key: 'storage', label: 'Storage', icon: <HardDrive className="h-5 w-5 text-violet-400" /> },
  { key: 'ai_engine', label: 'AI Engine', icon: <Brain className="h-5 w-5 text-violet-400" /> },
  { key: 'telephony', label: 'Telephony', icon: <Phone className="h-5 w-5 text-violet-400" /> },
  { key: 'integration', label: 'Integrations', icon: <Plug className="h-5 w-5 text-violet-400" /> },
]

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'healthy':
      return 'success'
    case 'degraded':
      return 'warning'
    case 'down':
      return 'danger'
    default:
      return 'info'
  }
}

export default function SystemHealthPage() {
  const { user } = useSession()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['systemHealth', orgId],
    queryFn: () => api.getSystemHealth(),
    enabled: !!orgId,
    refetchInterval: 30000,
  })

  const components = data?.components || {}

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-violet-400" /> System Health
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Deep dependency checks and component status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetch(); toast('Refreshed', 'info') }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load system health'} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Overall Status</p>
                <Badge variant={statusVariant(data?.status || 'unknown')} className="mt-2 capitalize">
                  {data?.status || 'unknown'}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Healthy Components</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {COMPONENTS.filter((c) => components[c.key]?.status === 'healthy').length} / {COMPONENTS.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Degraded</p>
                <p className="text-2xl font-bold text-yellow-400 mt-2">
                  {COMPONENTS.filter((c) => components[c.key]?.status === 'degraded').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Down</p>
                <p className="text-2xl font-bold text-red-400 mt-2">
                  {COMPONENTS.filter((c) => components[c.key]?.status === 'down').length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Component Details</CardTitle>
              <CardDescription>Latest health check for each system component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPONENTS.map((c) => {
                    const check = components[c.key]
                    return (
                      <TableRow key={c.key}>
                        <TableCell className="font-medium text-white flex items-center gap-2">
                          {c.icon} {c.label}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(check?.status || 'unknown')} className="capitalize">
                            {check?.status || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-neutral-400">
                          {check?.latencyMs != null ? `${check.latencyMs}ms` : '—'}
                        </TableCell>
                        <TableCell className="text-neutral-500 text-xs">
                          {check?.checkedAt ? new Date(check.checkedAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-neutral-400 text-xs max-w-[260px] truncate">
                          {check?.details ? JSON.stringify(check.details) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
