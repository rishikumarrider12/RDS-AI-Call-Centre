'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Input,
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
import { Webhook as WebhookIcon, Plus, Loader2, Trash2, Pencil, RefreshCw, Send } from 'lucide-react'
import type { Webhook, WebhookDelivery, WebhookDeliveryStatus } from '@rds/types'

const PAGE_SIZE = 10

function deliveryVariant(status: WebhookDeliveryStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'success':
      return 'success'
    case 'pending':
      return 'info'
    case 'retrying':
      return 'warning'
    case 'failed':
      return 'danger'
    default:
      return 'default'
  }
}

export default function WebhooksPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [viewDeliveries, setViewDeliveries] = useState<string | null>(null)
  const [deliveryPage, setDeliveryPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['webhooks', orgId],
    queryFn: () => api.listWebhooks(),
    enabled: !!orgId,
  })

  const { data: eventsData } = useQuery({
    queryKey: ['webhookEvents'],
    queryFn: () => api.getWebhookEvents(),
    enabled: !!orgId,
  })

  const webhooks = data?.webhooks ?? []
  const allEvents = eventsData?.events ?? []

  const { data: deliveriesData, isFetching: deliveriesLoading } = useQuery({
    queryKey: ['webhookDeliveries', orgId, viewDeliveries, deliveryPage],
    queryFn: () => api.listWebhookDeliveries(viewDeliveries!, { page: deliveryPage, pageSize: PAGE_SIZE }),
    enabled: !!viewDeliveries,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['webhooks', orgId] })

  const reset = () => {
    setUrl('')
    setEvents([])
    setIsActive(true)
    setCreateOpen(false)
    setEditId(null)
  }

  const toggleEvent = (evt: string) =>
    setEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]))

  const createMutation = useMutation({
    mutationFn: () => api.createWebhook({ url, events, isActive }),
    onSuccess: () => {
      reset()
      invalidate()
      toast('Webhook created', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to create webhook', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: (id: string) => api.updateWebhook(id, { url, events, isActive }),
    onSuccess: () => {
      reset()
      invalidate()
      toast('Webhook updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update webhook', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWebhook(id),
    onSuccess: () => {
      invalidate()
      toast('Webhook deleted', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete webhook', 'error'),
  })

  const retryMutation = useMutation({
    mutationFn: ({ id, deliveryId }: { id: string; deliveryId: string }) =>
      api.retryWebhookDelivery(id, deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookDeliveries', orgId, viewDeliveries, deliveryPage] })
      toast('Delivery retried', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to retry delivery', 'error'),
  })

  const openEdit = (wh: Webhook) => {
    setUrl(wh.url)
    setEvents(wh.events)
    setIsActive(wh.isActive)
    setEditId(wh.id)
  }

  const deliveryTotal = deliveriesData?.total ?? 0
  const deliveryPages = Math.max(1, Math.ceil(deliveryTotal / PAGE_SIZE))

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <WebhookIcon className="h-6 w-6 text-violet-400" /> Webhooks
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Receive real-time event notifications at your endpoints.</p>
        </div>
        <Button onClick={() => { reset(); setCreateOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Webhook
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : isError ? (
            <ErrorState message={(error as any)?.message || 'Failed to load webhooks'} onRetry={() => refetch()} />
          ) : webhooks.length === 0 ? (
            <EmptyState
              icon={<WebhookIcon className="h-7 w-7" />}
              title="No webhooks yet"
              description="Add an endpoint to start receiving real-time event notifications."
              action={
                <Button onClick={() => { reset(); setCreateOpen(true) }}>
                  <Plus className="h-4 w-4" /> Add Webhook
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh: Webhook) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-mono text-xs text-neutral-300 break-all max-w-[280px]">{wh.url}</TableCell>
                    <TableCell className="text-neutral-400">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {wh.events.map((e) => (
                          <Badge key={e} variant="info" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={wh.isActive ? 'success' : 'warning'}>{wh.isActive ? 'Active' : 'Paused'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="View deliveries"
                          onClick={() => { setViewDeliveries(wh.id); setDeliveryPage(1) }}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(wh)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (confirm('Delete this webhook?')) deleteMutation.mutate(wh.id)
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(createOpen || editId) && (
        <Dialog open onClose={reset}>
          <DialogHeader title={editId ? 'Edit Webhook' : 'Add Webhook'} onClose={reset} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Endpoint URL</span>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/rds"
              />
            </label>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Events</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-neutral-800 p-3">
                {allEvents.map((evt) => (
                  <label key={evt} className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={events.includes(evt)}
                      onChange={() => toggleEvent(evt)}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="font-mono text-xs">{evt}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-violet-500 focus:ring-violet-500"
              />
              Active (send events to this endpoint)
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button
              onClick={() => (editId ? updateMutation.mutate(editId) : createMutation.mutate())}
              disabled={createMutation.isPending || updateMutation.isPending || !url || events.length === 0}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{' '}
              {editId ? 'Save Changes' : 'Add'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {viewDeliveries && (
        <Dialog open onClose={() => setViewDeliveries(null)} className="max-w-3xl">
          <DialogHeader title="Webhook Deliveries" onClose={() => setViewDeliveries(null)} />
          <DialogBody className="space-y-4">
            {deliveriesLoading ? (
              <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading deliveries…
              </div>
            ) : (deliveriesData?.data.length ?? 0) === 0 ? (
              <div className="text-center py-10 text-neutral-500">No deliveries yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deliveriesData?.data ?? []).map((d: WebhookDelivery) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs text-neutral-300">{d.event}</TableCell>
                      <TableCell>
                        <Badge variant={deliveryVariant(d.status)} className="capitalize">{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-neutral-400">{d.httpStatus ?? '—'}</TableCell>
                      <TableCell className="text-neutral-400">{d.attempt}</TableCell>
                      <TableCell className="text-neutral-500 text-xs">
                        {new Date(d.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          title="Retry"
                          onClick={() => retryMutation.mutate({ id: viewDeliveries, deliveryId: d.id })}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
              <span>Page {deliveryPage} of {deliveryPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeliveryPage((p) => Math.max(1, p - 1))} disabled={deliveryPage <= 1}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeliveryPage((p) => Math.min(deliveryPages, p + 1))} disabled={deliveryPage >= deliveryPages}>
                  Next
                </Button>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setViewDeliveries(null)}>Close</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
