'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
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
  Select,
  EmptyState,
  ErrorState,
  TableSkeleton,
  useToast,
} from '@rds/ui'
import { Bell, Trash2, CheckCheck, Mail, MessageSquare, Smartphone, BellRing, Check, Loader2 } from 'lucide-react'
import type { Notification, NotificationPreferences, NotificationChannel } from '@rds/types'

const PAGE_SIZE = 10
const CHANNELS: NotificationChannel[] = ['billing', 'usage', 'security', 'support']
const CHANNEL_ICONS: Record<NotificationChannel, React.ComponentType<{ className?: string }>> = {
  billing: Mail,
  usage: MessageSquare,
  security: BellRing,
  support: Smartphone,
}
const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  billing: 'Billing',
  usage: 'Usage',
  security: 'Security',
  support: 'Support',
}
const MEANS = ['email', 'sms', 'push', 'in_app'] as const
const MEANS_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  in_app: 'In-App',
}
const MEANS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  in_app: Bell,
}

function fmtDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [channel, setChannel] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)

  const { data: prefsData, isLoading: prefsLoading } = useQuery({
    queryKey: ['notificationPrefs', orgId],
    queryFn: () => api.getNotificationPreferences(),
    enabled: !!orgId,
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', orgId, channel, unreadOnly, page],
    queryFn: () =>
      api.listNotifications({
        channel: channel || undefined,
        unreadOnly: unreadOnly || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!orgId,
  })

  const prefs: NotificationPreferences | undefined = prefsData?.preferences
  const notifications: Notification[] = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications', orgId] })
  const invalidatePrefs = () => queryClient.invalidateQueries({ queryKey: ['notificationPrefs', orgId] })

  const readMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => invalidate(),
    onError: (err: any) => toast(err.message || 'Failed to mark read', 'error'),
  })

  const readAllMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      invalidate()
      toast('All notifications marked as read', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to mark all read', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => invalidate(),
    onError: (err: any) => toast(err.message || 'Failed to delete notification', 'error'),
  })

  const updatePrefMutation = useMutation({
    mutationFn: (next: NotificationPreferences) => api.updateNotificationPreferences(next),
    onSuccess: () => {
      invalidatePrefs()
      toast('Preferences saved', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to save preferences', 'error'),
  })

  const togglePref = (ch: NotificationChannel, mean: string) => {
    if (!prefs) return
    const next: NotificationPreferences = {
      ...prefs,
      [ch]: { ...prefs[ch], [mean]: !prefs[ch][mean as keyof typeof prefs[typeof ch]] },
    }
    updatePrefMutation.mutate(next)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Bell className="h-6 w-6 text-violet-400" /> Notifications
        </h1>
        <p className="text-sm text-neutral-450 mt-1">Review alerts and choose how you want to be notified.</p>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex gap-2">
                  <Select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1) }} className="sm:w-48">
                    <option value="">All channels</option>
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {CHANNEL_LABELS[c]}
                      </option>
                    ))}
                  </Select>
                  <label className="flex items-center gap-2 text-sm text-neutral-300 px-3 rounded-lg border border-neutral-800">
                    <input
                      type="checkbox"
                      checked={unreadOnly}
                      onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1) }}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-violet-500 focus:ring-violet-500"
                    />
                    Unread only
                  </label>
                </div>
                <Button variant="outline" size="sm" onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}>
                  <CheckCheck className="h-4 w-4" /> Mark all read
                </Button>
              </div>

              {isLoading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : isError ? (
                <ErrorState message={(error as any)?.message || 'Failed to load notifications'} onRetry={() => refetch()} />
              ) : notifications.length === 0 ? (
                <EmptyState
                  icon={<Bell className="h-7 w-7" />}
                  title="No notifications"
                  description="You're all caught up. Alerts about billing, usage and security will show up here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Body</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((n: Notification) => {
                      const Icon = CHANNEL_ICONS[n.channel as NotificationChannel] ?? Bell
                      return (
                        <TableRow key={n.id} className={n.readAt ? '' : 'bg-violet-600/5'}>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-neutral-300">
                              <Icon className="h-4 w-4 text-violet-400" />
                              <span className="capitalize text-xs">{n.channel}</span>
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            <span className="flex items-center gap-2">
                              {!n.readAt && <span className="h-2 w-2 rounded-full bg-violet-400" />}
                              {n.title}
                            </span>
                          </TableCell>
                          <TableCell className="text-neutral-400 text-sm max-w-[280px] truncate">{n.body ?? '—'}</TableCell>
                          <TableCell className="text-neutral-500 text-xs">{fmtDate(n.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {!n.readAt && (
                                <button
                                  type="button"
                                  title="Mark read"
                                  onClick={() => readMutation.mutate(n.id)}
                                  className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => deleteMutation.mutate(n.id)}
                                className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}

              <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Prev
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardContent className="p-5 space-y-6">
              {prefsLoading || !prefs ? (
                <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading preferences…
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        {MEANS.map((m) => {
                          const Icon = MEANS_ICONS[m]
                          return (
                            <TableHead key={m} className="text-center">
                              <span className="inline-flex items-center gap-1.5">
                                <Icon className="h-4 w-4" /> {MEANS_LABELS[m]}
                              </span>
                            </TableHead>
                          )
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {CHANNELS.map((ch) => (
                        <TableRow key={ch}>
                          <TableCell className="font-medium text-white">{CHANNEL_LABELS[ch]}</TableCell>
                          {MEANS.map((m) => {
                            const checked = prefs[ch][m as keyof typeof prefs[typeof ch]]
                            return (
                              <TableCell key={m} className="text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePref(ch, m)}
                                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-violet-500 focus:ring-violet-500"
                                />
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="text-[11px] text-neutral-500 mt-3">
                    Choose which delivery methods you want for each notification category. Changes save automatically.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
