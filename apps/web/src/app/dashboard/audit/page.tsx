'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Input,
  Select,
  Badge,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  ErrorState,
  TableSkeleton,
  useToast,
} from '@rds/ui'
import { ScrollText, Download, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import type { AuditLog, AuditActorType } from '@rds/types'

const PAGE_SIZE = 15

function fmtDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function actorVariant(type: AuditActorType): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (type) {
    case 'user':
      return 'info'
    case 'system':
      return 'warning'
    case 'api':
      return 'success'
    default:
      return 'default'
  }
}

export default function AuditLogsPage() {
  const { user } = useSession()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [action, setAction] = useState('')
  const [actorType, setActorType] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<AuditLog | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['auditLogs', orgId, action, actorType, resourceType, search, dateFrom, dateTo, page],
    queryFn: () =>
      api.listAuditLogs({
        action: action || undefined,
        actorType: actorType || undefined,
        resourceType: resourceType || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!orgId,
  })

  const { data: actionsData } = useQuery({
    queryKey: ['auditActions'],
    queryFn: () => api.listAuditActions(),
    enabled: !!orgId,
  })

  const logs: AuditLog[] = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const actions: string[] = actionsData?.actions ?? []

  const resetPage = () => setPage(1)

  const handleExport = (format: 'csv' | 'json') => {
    const qs = new URLSearchParams({ format })
    if (action) qs.set('action', action)
    if (actorType) qs.set('actorType', actorType)
    if (resourceType) qs.set('resourceType', resourceType)
    if (search) qs.set('search', search)
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    api
      .downloadFile(`/api/audit/export?${qs.toString()}`, `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`)
      .then(() => toast('Export started', 'success'))
      .catch((err: any) => toast(err.message || 'Export failed', 'error'))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-violet-400" /> Audit Logs
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Immutable record of administrative and system actions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4" /> JSON
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage() }}
                placeholder="Search actor, resource or IP"
                className="pl-3"
              />
            </div>
            <Select value={action} onChange={(e) => { setAction(e.target.value); resetPage() }}>
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
            <Select value={actorType} onChange={(e) => { setActorType(e.target.value); resetPage() }}>
              <option value="">All actor types</option>
              <option value="user">User</option>
              <option value="system">System</option>
              <option value="api">API</option>
            </Select>
            <Input
              type="text"
              value={resourceType}
              onChange={(e) => { setResourceType(e.target.value); resetPage() }}
              placeholder="Resource type (e.g. call)"
            />
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPage() }} />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPage() }} />
          </div>

          {isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : isError ? (
            <ErrorState message={(error as any)?.message || 'Failed to load audit logs'} onRetry={() => refetch()} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-7 w-7" />}
              title="No audit entries"
              description="No audit entries match your current filters. Try widening your search."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-neutral-500 text-xs whitespace-nowrap">{fmtDate(log.createdAt)}</TableCell>
                    <TableCell className="font-medium text-white">{log.action}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={actorVariant(log.actorType)} className="capitalize">{log.actorType}</Badge>
                        <span className="text-neutral-300 text-xs">{log.actorName ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-400 text-xs">
                      {log.resourceType ? (
                        <>
                          {log.resourceType}
                          {log.resourceId ? <span className="font-mono text-neutral-600"> · {log.resourceId.slice(0, 8)}</span> : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-neutral-500 text-xs font-mono">{log.ipAddress ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => setDetail(log)}
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {detail && (
        <Dialog open onClose={() => setDetail(null)} className="max-w-2xl">
          <DialogHeader title="Audit Entry" onClose={() => setDetail(null)} />
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Mini label="Action" value={detail.action} />
              <Mini label="Actor Type" value={detail.actorType} />
              <Mini label="Actor" value={detail.actorName ?? '—'} />
              <Mini label="Email" value={detail.actorEmail ?? '—'} />
              <Mini label="Resource Type" value={detail.resourceType ?? '—'} />
              <Mini label="Resource ID" value={detail.resourceId ?? '—'} />
              <Mini label="IP Address" value={detail.ipAddress ?? '—'} />
              <Mini label="Timestamp" value={fmtDate(detail.createdAt)} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-400">Changes</p>
              {(detail.before || detail.after) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <pre className="max-h-64 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300 whitespace-pre-wrap">
                    {JSON.stringify(detail.before ?? {}, null, 2)}
                  </pre>
                  <pre className="max-h-64 overflow-auto rounded-lg border border-emerald-500/20 bg-emerald-600/5 p-3 text-xs text-emerald-200 whitespace-pre-wrap">
                    {JSON.stringify(detail.after ?? {}, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-neutral-600">No field-level changes recorded.</p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-neutral-200 break-all">{value}</p>
    </div>
  )
}
