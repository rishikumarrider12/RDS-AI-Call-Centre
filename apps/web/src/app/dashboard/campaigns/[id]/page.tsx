'use client'

import { useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, Input, Textarea, Badge, Button, useToast } from '@rds/ui'
import { ArrowLeft, Loader2, Play, Pause, CheckCircle, PenLine, Trash2 } from 'lucide-react'
import type { Campaign, CampaignStatus } from '@rds/types'

const TRANSITIONS: Array<{ status: CampaignStatus; label: string; icon: ReactNode; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = [
  { status: 'running', label: 'Start', icon: <Play className="h-4 w-4" />, variant: 'success' },
  { status: 'paused', label: 'Pause', icon: <Pause className="h-4 w-4" />, variant: 'warning' },
  { status: 'ended', label: 'Complete', icon: <CheckCircle className="h-4 w-4" />, variant: 'danger' },
  { status: 'draft', label: 'Reset to Draft', icon: <PenLine className="h-4 w-4" />, variant: 'default' },
]

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
      <p className="text-xs text-neutral-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  )
}

export default function CampaignDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''
  const id = params.id

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', script: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', orgId, id],
    queryFn: () => api.getCampaign(id),
    enabled: !!orgId && !!id,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['campaign', orgId, id] })

  const statusMutation = useMutation({
    mutationFn: (status: CampaignStatus) => api.setCampaignStatus(id, status),
    onSuccess: () => {
      invalidate()
      toast('Campaign status updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update status', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateCampaign(id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        script: form.script,
      }),
    onSuccess: () => {
      setEditing(false)
      invalidate()
      toast('Campaign updated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to update campaign', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCampaign(id),
    onSuccess: () => {
      toast('Campaign deleted', 'success')
      router.push('/dashboard/campaigns')
    },
    onError: (err: any) => toast(err.message || 'Failed to delete campaign', 'error'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500 py-20 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading campaign…
      </div>
    )
  }

  const campaign: Campaign | undefined = data?.campaign

  const startEdit = () => {
    if (!campaign) return
    setForm({
      name: campaign.name,
      description: campaign.description ?? '',
      script: campaign.script ?? '',
    })
    setEditing(true)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/campaigns" className="text-neutral-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">{campaign?.name}</h1>
            {campaign && (
              <Badge variant={campaign.status === 'running' ? 'success' : campaign.status === 'ended' ? 'danger' : 'default'} className="capitalize">
                {campaign.status === 'running' ? 'Active' : campaign.status === 'ended' ? 'Completed' : campaign.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-neutral-450 mt-1">Campaign details & controls.</p>
        </div>
      </div>

      {campaign && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total Contacts" value={campaign.totalContacts} />
            <Stat label="Completed" value={campaign.completedContacts} />
            <Stat label="Failed" value={campaign.failedContacts} />
            <Stat label="Type" value={campaign.type} />
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Status Control</h3>
              <div className="flex flex-wrap gap-2">
                {TRANSITIONS.map((t) => (
                  <Button
                    key={t.status}
                    variant={t.variant === 'default' ? 'outline' : 'default'}
                    onClick={() => statusMutation.mutate(t.status)}
                    disabled={statusMutation.isPending || campaign.status === t.status}
                  >
                    {t.icon} {t.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
                  {editing ? 'Edit Campaign' : 'Configuration'}
                </h3>
                {!editing && (
                  <Button variant="ghost" onClick={startEdit}>
                    <PenLine className="h-4 w-4" /> Edit
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-neutral-400">Name</span>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-neutral-400">Description</span>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-neutral-400">Script</span>
                    <Textarea
                      value={form.script}
                      onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))}
                      rows={5}
                    />
                  </label>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  <Row label="Description" value={campaign.description || '—'} />
                  <Row label="Contact List" value={campaign.contactListId || '—'} />
                  <Row label="Direction" value={campaign.direction} />
                  <Row label="Dialing Strategy" value={campaign.dialingStrategy || '—'} />
                  <Row label="Max Concurrent" value={campaign.maxConcurrent ?? '—'} />
                  <Row label="Voice" value={campaign.voice || '—'} />
                  <div className="pt-2 border-t border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-400 mb-2">Script</p>
                    <p className="text-neutral-300 whitespace-pre-wrap">{campaign.script || '—'}</p>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300"
              onClick={() => {
                if (confirm(`Delete campaign "${campaign.name}"?`)) deleteMutation.mutate()
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete Campaign
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-neutral-800/60 pb-2">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-200 capitalize truncate max-w-[60%]">{value}</span>
    </div>
  )
}
