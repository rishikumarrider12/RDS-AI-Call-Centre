'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, Input, Textarea, Select, Button, useToast } from '@rds/ui'
import { Megaphone, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCampaignPage() {
  const { user } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const { data: listsData } = useQuery({
    queryKey: ['contactLists', orgId],
    queryFn: () => api.listContactLists(),
    enabled: !!orgId,
  })

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'outbound' as 'outbound' | 'inbound',
    contactListId: '',
    script: '',
    voice: '',
    dialingStrategy: '' as '' | 'progressive' | 'predictive' | 'power',
    maxConcurrent: '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.createCampaign({
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type,
        direction: form.type,
        contactListId: form.contactListId || null,
        script: form.script,
        voice: form.voice,
        dialingStrategy: form.dialingStrategy || null,
        maxConcurrent: form.maxConcurrent ? parseInt(form.maxConcurrent, 10) : null,
      }),
    onSuccess: (res) => {
      toast('Campaign created', 'success')
      router.push(`/dashboard/campaigns/${res.campaign.id}`)
    },
    onError: (err: any) => setError(err.message || 'Failed to create campaign'),
  })

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  const canSubmit = form.name.trim().length >= 2

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/campaigns" className="text-neutral-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Campaign Builder</h1>
          <p className="text-sm text-neutral-450 mt-1">Configure a new calling campaign.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <Field label="Campaign Name" required>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Spring Renewals" />
          </Field>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What is this campaign about?"
              rows={3}
            />
          </Field>

          <Field label="Type">
            <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </Select>
          </Field>

          <Field label="Contact List">
            <Select value={form.contactListId} onChange={(e) => set('contactListId', e.target.value)}>
              <option value="">— None —</option>
              {(listsData?.lists ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Dialing Strategy">
            <Select value={form.dialingStrategy} onChange={(e) => set('dialingStrategy', e.target.value as any)}>
              <option value="">— Default —</option>
              <option value="progressive">Progressive</option>
              <option value="predictive">Predictive</option>
              <option value="power">Power</option>
            </Select>
          </Field>

          <Field label="Max Concurrent Calls">
            <Input
              type="number"
              min={1}
              value={form.maxConcurrent}
              onChange={(e) => set('maxConcurrent', e.target.value)}
              placeholder="10"
            />
          </Field>

          <Field label="Voice (label)">
            <Input value={form.voice} onChange={(e) => set('voice', e.target.value)} placeholder="Samantha" />
          </Field>

          <Field label="Script">
            <Textarea
              value={form.script}
              onChange={(e) => set('script', e.target.value)}
              placeholder="Hello, this is an automated call from…"
              rows={5}
            />
          </Field>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/dashboard/campaigns">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Create Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold text-neutral-400">
        {label}
        {required && <span className="text-violet-400"> *</span>}
      </span>
      {children}
    </label>
  )
}
