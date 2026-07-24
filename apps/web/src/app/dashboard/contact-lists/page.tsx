'use client'

import { useState, useCallback } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Input,
  Select,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Skeleton,
  useToast,
} from '@rds/ui'
import {
  Users,
  List,
  Upload,
  Search,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  GitMerge,
  BarChart3,
  ListFilter,
  X,
  Check,
} from 'lucide-react'
import type { ContactList, ContactSegment, ContactManagementDashboardStats } from '@rds/types'
import { parseCsv, analyzeCsv } from '@/lib/csv'

const PAGE_SIZE = 10

type TabValue = 'dashboard' | 'lists' | 'import' | 'duplicates' | 'segments'

export default function ContactListsPage() {
  const { user } = useSession()
  const [tab, setTab] = useState<TabValue>('dashboard')
  const orgId = user?.organization_id || ''

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['contact-dashboard-stats', orgId],
    queryFn: () => api.getContactDashboardStats().then((r) => r.stats),
    enabled: !!orgId && tab === 'dashboard',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Contact Management</h1>
        <p className="text-sm text-neutral-450 mt-1">Manage lists, import contacts, and organize your outreach.</p>
      </div>
      <Tabs defaultValue="dashboard" value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="lists">
            <List className="h-3.5 w-3.5 mr-1.5" /> Lists
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Import CSV
          </TabsTrigger>
          <TabsTrigger value="duplicates">
            <GitMerge className="h-3.5 w-3.5 mr-1.5" /> Duplicates
          </TabsTrigger>
          <TabsTrigger value="segments">
            <ListFilter className="h-3.5 w-3.5 mr-1.5" /> Segments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardStats stats={stats} loading={statsLoading} error={statsError} onRetry={() => refetchStats()} />
        </TabsContent>

        <TabsContent value="lists">
          <ListsTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="import">
          <ImportTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="duplicates">
          <DuplicatesTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="segments">
          <SegmentsTab orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DashboardStats({
  stats,
  loading,
  error,
  onRetry,
}: {
  stats: ContactManagementDashboardStats | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
}) {
  const cards = [
    { label: 'Total Contacts', value: stats?.totalContacts ?? 0, icon: Users, color: 'text-violet-400 border-violet-500/20 bg-violet-500/10' },
    { label: 'Active Lists', value: stats?.activeLists ?? 0, icon: List, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
    { label: 'Imported Today', value: stats?.importedToday ?? 0, icon: Download, color: 'text-sky-400 border-sky-500/20 bg-sky-500/10' },
    { label: 'Duplicate Contacts', value: stats?.duplicateContacts ?? 0, icon: GitMerge, color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
    { label: 'Import Success Rate', value: `${stats?.importSuccessRate ?? 0}%`, icon: BarChart3, color: 'text-purple-400 border-purple-500/20 bg-purple-500/10' },
    { label: 'Active Segments', value: stats?.activeSegments ?? 0, icon: ListFilter, color: 'text-pink-400 border-pink-500/20 bg-pink-500/10' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load stats"
        message="Unable to fetch contact management statistics."
        onRetry={onRetry}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30 backdrop-blur-md relative group hover:border-neutral-700 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-white mt-2">{card.value}</p>
            </div>
            <div className={`p-2.5 rounded-lg border ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListsTab({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contactLists', orgId],
    queryFn: () => api.listContactLists().then((r) => r.lists),
    enabled: !!orgId,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editList, setEditList] = useState<ContactList | null>(null)

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description?: string | null }) => api.createContactList(input),
    onSuccess: () => {
      setCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['contactLists', orgId] })
      toast('Contact list created', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to create list', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; name?: string; description?: string | null; tags?: string[] }) =>
      api.updateContactList(input.id, { name: input.name, description: input.description, tags: input.tags }),
    onSuccess: () => {
      setEditList(null)
      queryClient.invalidateQueries({ queryKey: ['contactLists', orgId] })
      toast('Contact list updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update list', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteContactList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactLists', orgId] })
      toast('Contact list deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete list', 'error'),
  })

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New List
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState message={(error as any)?.message || 'Failed to load contact lists'} onRetry={() => refetch()} />
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="No contact lists yet"
            description="Group your leads into lists, then assign them to campaigns."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New List
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.map((l) => (
              <div key={l.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 space-y-3 hover:border-neutral-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-white truncate">{l.name}</h4>
                    <p className="text-xs text-neutral-500 mt-1">{l.totalContacts} contacts</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => setEditList(l)}
                      className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete list "${l.name}"?`)) deleteMutation.mutate(l.id)
                      }}
                      className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {l.description && <p className="text-sm text-neutral-400 line-clamp-2">{l.description}</p>}
                {l.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {l.tags.map((t) => (
                      <Badge key={t} variant="info">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {createOpen && (
        <ListDialog
          title="New Contact List"
          onClose={() => setCreateOpen(false)}
          onSubmit={(input) => createMutation.mutate(input)}
          pending={createMutation.isPending}
        />
      )}
      {editList && (
        <ListDialog
          title="Edit Contact List"
          initial={editList}
          onClose={() => setEditList(null)}
          onSubmit={(input) => updateMutation.mutate({ id: editList.id, ...input })}
          pending={updateMutation.isPending}
        />
      )}
    </Card>
  )
}

function ListDialog({
  title,
  initial,
  onClose,
  onSubmit,
  pending,
}: {
  title: string
  initial?: ContactList
  onClose: () => void
  onSubmit: (input: { name: string; description?: string | null; tags?: string[] }) => void
  pending: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader title={title} onClose={onClose} />
      <DialogBody className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-400">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP Customers" />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-400">Description</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </label>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit({ name, description: description || null })} disabled={pending || !name.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function ImportTab({ orgId }: { orgId: string }) {
  const { toast } = useToast()
  const [listId, setListId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<ReturnType<typeof parseCsv> | null>(null)
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeCsv> | null>(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<null | {
    inserted: number
    duplicatesSkipped: number
    errors: number
    totalRows: number
    errorSamples: { row: number; message: string }[]
  }>(null)
  const [importing, setImporting] = useState(false)

  const { data: listsData } = useQuery({
    queryKey: ['contactLists', orgId],
    queryFn: () => api.listContactLists().then((r) => r.lists),
    enabled: !!orgId,
  })

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setResult(null)
    const text = await f.text()
    setCsvText(text)
    const parsed = parseCsv(text)
    setPreview(parsed)
    setAnalysis(analyzeCsv(parsed))
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const importMutation = useMutation({
    mutationFn: () =>
      api.importContactsCsv({ csv: csvText, contactListId: listId || null, skipDuplicates: true }),
    onSuccess: (res) => {
      setResult({
        inserted: res.inserted,
        duplicatesSkipped: res.duplicatesSkipped,
        errors: res.errors,
        totalRows: res.totalRows,
        errorSamples: res.errorSamples,
      })
      toast(`Imported ${res.inserted} contact(s)`, 'success')
    },
    onError: (err: any) => toast(err.message || 'Import failed', 'error'),
    onSettled: () => setImporting(false),
  })

  const startImport = () => {
    if (!csvText) return
    setImporting(true)
    importMutation.mutate()
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-neutral-400">Target Contact List</span>
            <Select value={listId} onChange={(e) => setListId(e.target.value)}>
              <option value="">— Uncategorized —</option>
              {(listsData ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? 'border-violet-500 bg-violet-600/10' : 'border-neutral-700 bg-neutral-950'
            }`}
          >
            <FileSpreadsheet className="h-8 w-8 mx-auto text-neutral-500 mb-2" />
            <p className="text-sm text-neutral-400">
              {file ? file.name : 'Drag & drop a CSV file here, or'}
            </p>
            <label className="inline-block mt-3">
              <span className="text-violet-400 text-sm cursor-pointer hover:underline">browse files</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </label>
            <p className="text-[11px] text-neutral-600 mt-2">
              Columns: first name, last name, email, phone (required), country, timezone, tags, source
            </p>
          </div>

          {preview && analysis && !result && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="info">{analysis.totalRows} rows</Badge>
                <Badge variant="success">{analysis.validRows} valid</Badge>
                {analysis.duplicatePhones > 0 && (
                  <Badge variant="warning">
                    <AlertTriangle className="h-3 w-3 mr-1" /> {analysis.duplicatePhones} duplicate phones
                  </Badge>
                )}
                {analysis.missingPhone > 0 && (
                  <Badge variant="danger">
                    <AlertTriangle className="h-3 w-3 mr-1" /> {analysis.missingPhone} missing phone
                  </Badge>
                )}
              </div>

              <div className="rounded-lg border border-neutral-800 overflow-hidden">
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900 text-neutral-400">
                      <tr>
                        {preview.headers.map((h) => (
                          <th key={h} className="p-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {preview.rows.slice(0, 6).map((r, i) => (
                        <tr key={i}>
                          {preview.headers.map((h, hi) => (
                            <td key={h} className="p-2 text-neutral-300">
                              {r[hi] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {analysis.sampleDuplicates.length > 0 && (
                <p className="text-xs text-amber-400">
                  Duplicate phones within file: {analysis.sampleDuplicates.join(', ')}
                  {analysis.duplicatePhones > analysis.sampleDuplicates.length ? ' ...' : ''}
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={startImport}
                  disabled={!csvText || importing}
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Import Contacts
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Import complete</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{result.inserted}</p>
                  <p className="text-xs text-neutral-500 mt-1">Inserted</p>
                </div>
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 text-center">
                  <p className="text-2xl font-bold text-amber-400">{result.duplicatesSkipped}</p>
                  <p className="text-xs text-neutral-500 mt-1">Duplicates Skipped</p>
                </div>
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 text-center">
                  <p className="text-2xl font-bold text-red-400">{result.errors}</p>
                  <p className="text-xs text-neutral-500 mt-1">Errors</p>
                </div>
              </div>
              {result.errorSamples.length > 0 && (
                <div className="rounded-lg border border-neutral-800 p-3 text-xs space-y-1">
                  <p className="font-semibold text-neutral-300">First errors:</p>
                  {result.errorSamples.map((e, i) => (
                    <p key={i} className="text-neutral-500">
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DuplicatesTab({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['duplicateContacts', orgId, statusFilter],
    queryFn: () => api.listDuplicateContacts(statusFilter ? { status: statusFilter } : undefined).then((r) => r.duplicates),
    enabled: !!orgId,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ duplicateId, status }: { duplicateId: string; status: 'reviewed' | 'merged' | 'ignored' }) =>
      api.resolveDuplicateContact(duplicateId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicateContacts', orgId] })
      toast('Duplicate resolved', 'success')
      setResolvingId(null)
    },
    onError: (err: any) => toast(err.message || 'Failed to resolve duplicate', 'error'),
  })

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-52">
            <option value="">All statuses</option>
            <option value="detected">Detected</option>
            <option value="reviewed">Reviewed</option>
            <option value="merged">Merged</option>
            <option value="ignored">Ignored</option>
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : isError ? (
          <ErrorState message={(error as any)?.message || 'Failed to load duplicates'} onRetry={() => refetch()} />
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Check className="h-7 w-7" />}
            title="No duplicates found"
            description="Great job! There are no duplicate contacts to review."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm text-neutral-300">{d.duplicate_of_phone}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === 'ignored' ? 'default' : d.status === 'merged' ? 'success' : 'warning'}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-500 text-xs">
                    {new Date(d.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {d.status === 'detected' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveMutation.mutate({ duplicateId: d.id, status: 'merged' })}
                          disabled={resolvingId === d.id}
                        >
                          {resolvingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Merge
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveMutation.mutate({ duplicateId: d.id, status: 'ignored' })}
                          disabled={resolvingId === d.id}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function SegmentsTab({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<ContactSegment | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contactSegments', orgId],
    queryFn: () => api.listContactSegments().then((r) => r.segments),
    enabled: !!orgId,
  })

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description?: string | null; filters?: Record<string, unknown> }) =>
      api.createContactSegment(input),
    onSuccess: () => {
      setCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['contactSegments', orgId] })
      queryClient.invalidateQueries({ queryKey: ['contact-dashboard-stats', orgId] })
      toast('Segment created', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to create segment', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteContactSegment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactSegments', orgId] })
      setSelectedSegment(null)
      toast('Segment deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete segment', 'error'),
  })

  const refreshMutation = useMutation({
    mutationFn: (id: string) => api.refreshContactSegment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactSegments', orgId] })
      toast('Segment refreshed', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to refresh segment', 'error'),
  })

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Segment
          </Button>
        </div>
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : isError ? (
          <ErrorState message={(error as any)?.message || 'Failed to load segments'} onRetry={() => refetch()} />
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<ListFilter className="h-7 w-7" />}
            title="No segments yet"
            description="Create segments to group contacts by smart filters."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New Segment
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((s: ContactSegment) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-white">{s.name}</p>
                      {s.description && <p className="text-xs text-neutral-500 mt-0.5">{s.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral-300">{s.contactCount}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'success' : 'default'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSegment(s)}
                      >
                        <Search className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshMutation.mutate(s.id)}
                        disabled={refreshMutation.isPending}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete segment "${s.name}"?`)) deleteMutation.mutate(s.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {createOpen && (
        <CreateSegmentDialog
          onClose={() => setCreateOpen(false)}
          onSubmit={(input) => createMutation.mutate(input)}
          pending={createMutation.isPending}
        />
      )}
      {selectedSegment && (
        <SegmentDetailDialog
          segment={selectedSegment}
          orgId={orgId}
          onClose={() => setSelectedSegment(null)}
        />
      )}
    </Card>
  )
}

function CreateSegmentDialog({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void
  onSubmit: (input: { name: string; description?: string | null; filters?: Record<string, unknown> }) => void
  pending: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader title="New Segment" onClose={onClose} />
      <DialogBody className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-400">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="High Value Customers" />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-neutral-400">Description</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </label>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit({ name, description: description || null })} disabled={pending || !name.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function SegmentDetailDialog({
  segment,
  orgId,
  onClose,
}: {
  segment: ContactSegment
  orgId: string
  onClose: () => void
}) {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['segment-contacts', orgId, segment.id, page, search],
    queryFn: () =>
      api.getContactSegmentContacts(segment.id, { page, pageSize: 10, search: search || undefined }),
    enabled: !!orgId && !!segment.id,
  })

  const exportMutation = useMutation({
    mutationFn: () => api.exportContacts({ contactListId: null, search }),
    onSuccess: () => toast('Export started', 'success'),
    onError: (err: any) => toast(err.message || 'Export failed', 'error'),
  })

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <DialogHeader
        title={segment.name}
        onClose={onClose}
      >
        {segment.description && (
          <p className="text-xs text-neutral-500 mt-1">{segment.description}</p>
        )}
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search contacts..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => exportMutation.mutate()}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : isError ? (
          <ErrorState message={(error as any)?.message || 'Failed to load contacts'} onRetry={() => refetch()} />
        ) : (data?.contacts?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="No contacts in this segment"
            description="This segment has no matching contacts."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.contacts?.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-white">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell className="text-neutral-400 font-mono text-xs">{c.phone}</TableCell>
                    <TableCell className="text-neutral-400">{c.email || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="info">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
              <span>
                Page {page} of {Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? PAGE_SIZE)))}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil((data?.total ?? 0) / (data?.pageSize ?? PAGE_SIZE))}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogBody>
    </Dialog>
  )
}
