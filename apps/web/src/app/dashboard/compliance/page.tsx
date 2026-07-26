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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  Select,
  useToast,
  EmptyState,
  ErrorState,
  TableSkeleton,
  LoadingState,
} from '@rds/ui'
import {
  Scale,
  ShieldCheck,
  PhoneOff,
  FileCheck2,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  Database,
  ScrollText,
  AlertTriangle,
  Download,
} from 'lucide-react'

function fmtDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusCard({
  label,
  enabled,
  hint,
}: {
  label: string
  enabled: boolean
  hint?: string
}) {
  return (
    <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-300">{label}</span>
        <Badge variant={enabled ? 'success' : 'warning'}>{enabled ? 'Active' : 'Inactive'}</Badge>
      </div>
      {hint && <p className="text-xs text-neutral-500 mt-2">{hint}</p>}
    </div>
  )
}

export default function CompliancePage() {
  const { user } = useSession()
  const orgId = user?.organization_id || ''

  const statusQuery = useQuery({
    queryKey: ['compliance', 'status', orgId],
    queryFn: () => api.getComplianceStatus(),
    enabled: !!orgId,
  })

  const auditSummaryQuery = useQuery({
    queryKey: ['compliance', 'audit-summary', orgId],
    queryFn: () => api.getAuditSummary(),
    enabled: !!orgId,
  })

  if (!orgId) {
    return <LoadingState label="Loading organization…" />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Scale className="h-6 w-6 text-violet-400" /> Compliance &amp; Security
        </h1>
        <p className="text-sm text-neutral-450 mt-1">
          Consent enforcement, DND registry, retention policies, data-subject requests and immutable audit logging.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="dnd">DND Registry</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="requests">Data Requests</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {statusQuery.isLoading ? (
            <TableSkeleton rows={4} cols={2} />
          ) : statusQuery.isError ? (
            <ErrorState
              message={(statusQuery.error as any)?.message || 'Failed to load compliance status'}
              onRetry={() => statusQuery.refetch()}
            />
          ) : (
            <OverviewTab
              status={statusQuery.data?.status}
              auditSummary={auditSummaryQuery.data?.summary}
              onRefresh={() => {
                statusQuery.refetch()
                auditSummaryQuery.refetch()
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="consent">
          <ConsentTab />
        </TabsContent>

        <TabsContent value="dnd">
          <DndTab />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionTab />
        </TabsContent>

        <TabsContent value="requests">
          <DataRequestsTab />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTab summary={auditSummaryQuery.data?.summary} loading={auditSummaryQuery.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab({
  status,
  auditSummary,
  onRefresh,
}: {
  status?: any
  auditSummary?: any
  onRefresh: () => void
}) {
  const items: Array<{ label: string; enabled: boolean; hint?: string }> = [
    {
      label: 'DND Pre-Check',
      enabled: !!status?.dndCheckEnabled,
      hint: 'Numbers on the DND registry are blocked before dialing.',
    },
    {
      label: 'Consent Required',
      enabled: !!status?.consentRequired,
      hint: 'Mandatory disclosure recording is enforced on outbound calls.',
    },
    {
      label: 'Immutable Audit Log',
      enabled: !!status?.auditImmutable,
      hint: 'Audit records are append-only and cannot be modified or deleted.',
    },
    {
      label: 'PII Masking',
      enabled: !!status?.piiMaskingEnabled,
      hint: 'Phone numbers, emails and names are masked in all logs.',
    },
    {
      label: 'HTTPS / HSTS',
      enabled: !!status?.hstsEnforced,
      hint: 'Strict-Transport-Security is enforced in production.',
    },
    {
      label: 'Encryption at Rest',
      enabled: !!status?.encryptionAtRest,
      hint: 'Sensitive PII fields are encrypted with AES-256-GCM.',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Control Status</h2>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <StatusCard key={it.label} label={it.label} enabled={it.enabled} hint={it.hint} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-400" /> Audit Trail Snapshot
          </CardTitle>
          <CardDescription>Immutable, append-only record of administrative and system actions.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Total Events" value={auditSummary?.total ?? '—'} />
          <Metric label="First Event" value={fmtDate(auditSummary?.oldestAt ?? null)} />
          <Metric label="Latest Event" value={fmtDate(auditSummary?.newestAt ?? null)} />
          <Metric label="Distinct Actions" value={auditSummary?.byAction?.length ?? '—'} />
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-white mt-1 truncate">{value}</p>
    </div>
  )
}

function ConsentTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [contactId, setContactId] = useState('')
  const [callId, setCallId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [method, setMethod] = useState('automated_disclosure')
  const [consented, setConsented] = useState(true)

  const disclosureQuery = useQuery({
    queryKey: ['compliance', 'disclosure-text'],
    queryFn: () => api.getDisclosureText(),
  })

  const listQuery = useQuery({
    queryKey: ['compliance', 'consent', contactId],
    queryFn: () => api.listConsent(contactId),
    enabled: !!contactId,
  })

  const recordMutation = useMutation({
    mutationFn: () =>
      api.recordConsent({
        contactId: contactId || null,
        callId: callId || null,
        campaignId: campaignId || null,
        method: method as any,
        consented,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'consent', contactId] })
      queryClient.invalidateQueries({ queryKey: ['compliance', 'audit-summary'] })
      toast('Consent recorded', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to record consent', 'error'),
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-violet-400" /> Consent Recording
          </CardTitle>
          <CardDescription>
            {disclosureQuery.data?.text ||
              'Mandatory disclosure is presented at the start of each call before any processing.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Contact ID" value={contactId} onChange={(e) => setContactId(e.target.value)} />
            <Input placeholder="Call ID (optional)" value={callId} onChange={(e) => setCallId(e.target.value)} />
            <Input placeholder="Campaign ID (optional)" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="automated_disclosure">Automated Disclosure</option>
              <option value="verbal">Verbal</option>
              <option value="ivr">IVR</option>
              <option value="keypress">Keypress</option>
              <option value="written">Written</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-violet-500 focus:ring-violet-500"
            />
            Consent granted (uncheck to record a decline)
          </label>
          <Button
            onClick={() => recordMutation.mutate()}
            disabled={recordMutation.isPending}
            loading={recordMutation.isPending}
          >
            <CheckCircle className="h-4 w-4" /> Record Consent
          </Button>
        </CardContent>
      </Card>

      {contactId && (
        <Card>
          <CardHeader>
            <CardTitle>Consent History</CardTitle>
          </CardHeader>
          <CardContent>
            {listQuery.isLoading ? (
              <TableSkeleton rows={3} cols={4} />
            ) : (listQuery.data?.records.length ?? 0) === 0 ? (
              <EmptyState icon={<FileCheck2 className="h-7 w-7" />} title="No consent records" description="Record a consent event for this contact to see it here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consented</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data?.records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={r.consented ? 'success' : 'danger'}>{r.consented ? 'Granted' : 'Declined'}</Badge>
                      </TableCell>
                      <TableCell className="text-neutral-300 capitalize">{r.method.replace('_', ' ')}</TableCell>
                      <TableCell className="text-neutral-400 font-mono text-xs truncate max-w-[160px]">{r.campaignId || '—'}</TableCell>
                      <TableCell className="text-neutral-400 text-xs">{fmtDate(r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DndTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [phone, setPhone] = useState('')
  const [checkPhone, setCheckPhone] = useState('')
  const [checkResult, setCheckResult] = useState<boolean | null>(null)

  const listQuery = useQuery({
    queryKey: ['compliance', 'dnd', search],
    queryFn: () => api.listDnd({ search: search || undefined, pageSize: 25 }),
  })

  const addMutation = useMutation({
    mutationFn: () => api.addDnd({ phone, source: 'manual' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'dnd'] })
      setPhone('')
      toast('DND entry added', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to add DND entry', 'error'),
  })

  const removeMutation = useMutation({
    mutationFn: (p: string) => api.removeDnd(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'dnd'] })
      toast('DND entry removed', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to remove DND entry', 'error'),
  })

  const handleCheck = async () => {
    if (!checkPhone) return
    try {
      const res = await api.checkDnd(checkPhone)
      setCheckResult(res.blocked)
    } catch (err: any) {
      toast(err.message || 'DND check failed', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneOff className="h-5 w-5 text-violet-400" /> Do-Not-Disturb Registry
          </CardTitle>
          <CardDescription>Numbers added here are blocked before any outbound dial (Phase 5.5).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
            <Button onClick={() => addMutation.mutate()} disabled={!phone || addMutation.isPending} loading={addMutation.isPending}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Check a number…" value={checkPhone} onChange={(e) => setCheckPhone(e.target.value)} className="flex-1" />
            <Button variant="outline" onClick={handleCheck}>
              Check
            </Button>
            {checkResult !== null && (
              <Badge variant={checkResult ? 'danger' : 'success'}>
                {checkResult ? 'Blocked' : 'Clear'}
              </Badge>
            )}
          </div>
          <Input
            placeholder="Search registry…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {listQuery.isLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : (listQuery.data?.entries.length ?? 0) === 0 ? (
            <EmptyState icon={<PhoneOff className="h-7 w-7" />} title="No DND entries" description="Add a number above to suppress outbound dialing to it." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data?.entries.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs text-neutral-200">{e.phone}</TableCell>
                    <TableCell className="text-neutral-400">{e.source || '—'}</TableCell>
                    <TableCell className="text-neutral-400 text-xs">{fmtDate(e.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => removeMutation.mutate(e.phone)}
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RetentionTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [resourceType, setResourceType] = useState('calls')
  const [retentionDays, setRetentionDays] = useState('365')
  const [action, setAction] = useState('delete')

  const listQuery = useQuery({
    queryKey: ['compliance', 'retention'],
    queryFn: () => api.listRetentionPolicies(),
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      api.upsertRetentionPolicy({
        resourceType,
        retentionDays: parseInt(retentionDays, 10) || 0,
        action: action as any,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'retention'] })
      toast('Retention policy saved', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to save retention policy', 'error'),
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-400" /> Data Retention Policies
          </CardTitle>
          <CardDescription>Define how long each resource type is retained before automatic deletion or anonymization (Phase 5.8).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="Resource type" value={resourceType} onChange={(e) => setResourceType(e.target.value)} />
            <Input
              type="number"
              min={0}
              placeholder="Days"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
            />
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="delete">Delete</option>
              <option value="anonymize">Anonymize</option>
            </Select>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} loading={saveMutation.isPending}>
            <Plus className="h-4 w-4" /> Save Policy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {listQuery.isLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : (listQuery.data?.policies.length ?? 0) === 0 ? (
            <EmptyState icon={<Database className="h-7 w-7" />} title="No retention policies" description="Define a policy above to govern data lifecycle." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data?.policies.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-white capitalize">{p.resourceType}</TableCell>
                    <TableCell className="text-neutral-300">{p.retentionDays} days</TableCell>
                    <TableCell>
                      <Badge variant={p.action === 'delete' ? 'danger' : 'info'}>{p.action}</Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400 text-xs">{fmtDate(p.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DataRequestsTab() {
  const { toast } = useToast()
  const [exportId, setExportId] = useState('')
  const [deletionId, setDeletionId] = useState('')
  const [exportResult, setExportResult] = useState<any>(null)
  const [deletionResult, setDeletionResult] = useState<any>(null)

  const exportMutation = useMutation({
    mutationFn: () => api.requestDataExport(),
    onSuccess: (res) => {
      setExportResult(res.request)
      toast('Data export requested', 'success')
    },
    onError: (err: any) => toast(err.message || 'Request failed', 'error'),
  })

  const deletionMutation = useMutation({
    mutationFn: () => api.requestDataDeletion('all'),
    onSuccess: (res) => {
      setDeletionResult(res.request)
      toast('Data deletion requested', 'success')
    },
    onError: (err: any) => toast(err.message || 'Request failed', 'error'),
  })

  const lookupExport = async () => {
    try {
      const res = await api.getDataExport(exportId)
      setExportResult(res.request)
    } catch (err: any) {
      toast(err.message || 'Lookup failed', 'error')
    }
  }

  const lookupDeletion = async () => {
    try {
      const res = await api.getDataDeletion(deletionId)
      setDeletionResult(res.request)
    } catch (err: any) {
      toast(err.message || 'Lookup failed', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-400" /> Data Subject Requests
          </CardTitle>
          <CardDescription>GDPR-style right to access (export) and right to erasure (Phase 5.9).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending} loading={exportMutation.isPending}>
              <Download className="h-4 w-4" /> Request Data Export
            </Button>
            <Button variant="destructive" onClick={() => deletionMutation.mutate()} disabled={deletionMutation.isPending} loading={deletionMutation.isPending}>
              <Trash2 className="h-4 w-4" /> Request Data Erasure
            </Button>
          </div>

          {exportResult && (
            <RequestCard title="Export Request" request={exportResult} />
          )}
          {deletionResult && (
            <RequestCard title="Deletion Request" request={deletionResult} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex gap-2">
              <Input placeholder="Export request ID" value={exportId} onChange={(e) => setExportId(e.target.value)} className="flex-1" />
              <Button variant="outline" size="sm" onClick={lookupExport}>Lookup</Button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Deletion request ID" value={deletionId} onChange={(e) => setDeletionId(e.target.value)} className="flex-1" />
              <Button variant="outline" size="sm" onClick={lookupDeletion}>Lookup</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RequestCard({ title, request }: { title: string; request: any }) {
  const statusVariant =
    request.status === 'completed' ? 'success' : request.status === 'failed' ? 'danger' : 'warning'
  return (
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-neutral-500 font-mono truncate max-w-[220px]">{request.id}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={statusVariant}>{request.status}</Badge>
        <span className="text-xs text-neutral-400">{fmtDate(request.requestedAt)}</span>
      </div>
    </div>
  )
}

function AuditTab({ summary, loading }: { summary?: any; loading?: boolean }) {
  if (loading) return <LoadingState label="Loading audit summary…" />
  if (!summary) return <EmptyState icon={<ScrollText className="h-7 w-7" />} title="No audit data" />
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-violet-400" /> Immutable Audit Summary
        </CardTitle>
        <CardDescription>Append-only log of all administrative and system actions (Phase 5.6).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Total Events" value={summary.total} />
          <Metric label="First Event" value={fmtDate(summary.oldestAt)} />
          <Metric label="Latest Event" value={fmtDate(summary.newestAt)} />
          <Metric label="Actions" value={summary.byAction?.length ?? 0} />
        </div>
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Top Actions</p>
          <div className="space-y-2">
            {(summary.byAction || []).slice(0, 8).map((a: any) => (
              <div key={a.action} className="flex items-center gap-3">
                <span className="text-sm text-neutral-300 w-48 truncate font-mono">{a.action}</span>
                <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-violet-500"
                    style={{ width: `${Math.max(4, (a.count / (summary.byAction[0]?.count || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-400 w-10 text-right">{a.count}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-amber-400/80">
          <AlertTriangle className="h-4 w-4" /> Audit records cannot be edited or deleted once written.
        </p>
      </CardContent>
    </Card>
  )
}
