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
  Search,
  Plus,
  Trash2,
  Pencil,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import type { Contact, ContactList } from '@rds/types'
import { parseCsv, analyzeCsv } from '@/lib/csv'

const PAGE_SIZE = 10

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Contacts</h1>
        <p className="text-sm text-neutral-450 mt-1">Manage contact lists, import leads and organize your reach.</p>
      </div>
      <Tabs defaultValue="lists">
        <TabsList>
          <TabsTrigger value="lists">Contact Lists</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>
        <TabsContent value="lists">
          <ListsTab />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ListsTab() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contactLists', orgId],
    queryFn: () => api.listContactLists(),
    enabled: !!orgId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contactLists', orgId] })

  const [createOpen, setCreateOpen] = useState(false)
  const [editList, setEditList] = useState<ContactList | null>(null)

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description?: string | null }) => api.createContactList(input),
    onSuccess: () => {
      setCreateOpen(false)
      invalidate()
      toast('Contact list created', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to create list', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; name?: string; description?: string | null }) =>
      api.updateContactList(input.id, { name: input.name, description: input.description }),
    onSuccess: () => {
      setEditList(null)
      invalidate()
      toast('Contact list updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update list', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteContactList(id),
    onSuccess: () => {
      invalidate()
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
        ) : (data?.lists.length ?? 0) === 0 ? (
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
            {data?.lists.map((l) => (
              <div key={l.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{l.name}</h4>
                    <p className="text-xs text-neutral-500 mt-1">{l.totalContacts} contacts</p>
                  </div>
                  <div className="flex gap-1">
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
  onSubmit: (input: { name: string; description?: string | null }) => void
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

function ContactsTab() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [search, setSearch] = useState('')
  const [listFilter, setListFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importOpen, setImportOpen] = useState(false)

  const { data: listsData } = useQuery({
    queryKey: ['contactLists', orgId],
    queryFn: () => api.listContactLists(),
    enabled: !!orgId,
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contacts', orgId, search, listFilter, page],
    queryFn: () => api.listContacts({ search, contactListId: listFilter || undefined, page, pageSize: PAGE_SIZE }),
    enabled: !!orgId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contacts', orgId] })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteContacts(ids),
    onSuccess: (res) => {
      setSelected(new Set())
      invalidate()
      toast(`Deleted ${res.deleted} contact(s)`, 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete', 'error'),
  })

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const allSelected = (data?.data.length ?? 0) > 0 && (data?.data ?? []).every((c) => selected.has(c.id))

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, phone or email"
              className="pl-9"
            />
          </div>
          <Select value={listFilter} onChange={(e) => { setListFilter(e.target.value); setPage(1) }} className="sm:w-52">
            <option value="">All lists</option>
            {(listsData?.lists ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 text-sm text-neutral-300 bg-violet-600/10 border border-violet-500/20 rounded-lg px-4 py-2">
            <span>{selected.size} selected</span>
            <BulkUpdateDialog
              lists={listsData?.lists ?? []}
              onApply={async (data) => {
                await api.bulkUpdateContacts(Array.from(selected), data)
                toast(`Updated ${selected.size} contact(s)`, 'success')
                setSelected(new Set())
                invalidate()
              }}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${selected.size} contact(s)?`)) bulkDeleteMutation.mutate(Array.from(selected))
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : isError ? (
          <ErrorState message={(error as any)?.message || 'Failed to load contacts'} onRetry={() => refetch()} />
        ) : (data?.data.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="No contacts found"
            description="Import a CSV of leads or add contacts to get started."
            action={
              <Button onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set((data?.data ?? []).map((c) => c.id)))
                      else setSelected(new Set())
                    }}
                    className="accent-violet-500"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>DND</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((c: Contact) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="accent-violet-500"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                  </TableCell>
                  <TableCell className="text-neutral-400 font-mono text-xs">{c.phone}</TableCell>
                  <TableCell className="text-neutral-400">{c.email || '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="info">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.dndStatus ? (
                      <Badge variant="danger">DND</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {importOpen && (
        <ImportDialog
          lists={listsData?.lists ?? []}
          onClose={() => setImportOpen(false)}
          onDone={() => {
            setImportOpen(false)
            invalidate()
          }}
        />
      )}
    </Card>
  )
}

function BulkUpdateDialog({
  lists,
  onApply,
}: {
  lists: ContactList[]
  onApply: (data: { contactListId?: string | null; tags?: string[]; dndStatus?: boolean }) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [listId, setListId] = useState('')
  const [dnd, setDnd] = useState('')

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Update
      </Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)}>
          <DialogHeader title="Bulk Update" onClose={() => setOpen(false)} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Move to list</span>
              <Select value={listId} onChange={(e) => setListId(e.target.value)}>
                <option value="">— No change —</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">DND status</span>
              <Select value={dnd} onChange={(e) => setDnd(e.target.value)}>
                <option value="">— No change —</option>
                <option value="true">Enable DND</option>
                <option value="false">Disable DND</option>
              </Select>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const data: { contactListId?: string | null; dndStatus?: boolean } = {}
                if (listId) data.contactListId = listId
                if (dnd) data.dndStatus = dnd === 'true'
                await onApply(data)
                setOpen(false)
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  )
}

function ImportDialog({
  lists,
  onClose,
  onDone,
}: {
  lists: ContactList[]
  onClose: () => void
  onDone: () => void
}) {
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

  const handleFile = async (f: File) => {
    setFile(f)
    const text = await f.text()
    setCsvText(text)
    const parsed = parseCsv(text)
    setPreview(parsed)
    setAnalysis(analyzeCsv(parsed))
    setResult(null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

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
  })

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <DialogHeader
        title={result ? 'Import Summary' : 'Import Contacts (CSV)'}
        onClose={onClose}
      />
      <DialogBody className="space-y-4">
        {!result ? (
          <>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Target Contact List</span>
              <Select value={listId} onChange={(e) => setListId(e.target.value)}>
                <option value="">— Uncategorized —</option>
                {lists.map((l) => (
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

            {preview && analysis && (
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
                    {analysis.duplicatePhones > analysis.sampleDuplicates.length ? ' …' : ''}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Import complete</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard label="Inserted" value={result.inserted} variant="success" />
              <SummaryCard label="Duplicates skipped" value={result.duplicatesSkipped} variant="warning" />
              <SummaryCard label="Errors" value={result.errors} variant="danger" />
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
      </DialogBody>
      <DialogFooter>
        {result ? (
          <Button onClick={onDone}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={!csvText || importMutation.isPending}
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  )
}

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: 'success' | 'warning' | 'danger'
}) {
  return (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 text-center">
      <p className={`text-2xl font-bold ${
        variant === 'success' ? 'text-emerald-400' : variant === 'warning' ? 'text-amber-400' : 'text-red-400'
      }`}>
        {value}
      </p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  )
}
