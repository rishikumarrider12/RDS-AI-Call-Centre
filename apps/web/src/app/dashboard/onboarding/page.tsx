'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, Input, Select, Textarea, Button } from '@rds/ui'
import { Building2, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

const STEPS = ['Organization', 'Company Info', 'Plan', 'Finish']

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Singapore',
]
const LOCALES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE']

export default function OnboardingPage() {
  const { refresh } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    timezone: 'UTC',
    locale: 'en-US',
    plan: 'starter' as 'starter' | 'growth' | 'enterprise',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.onboardOrganization(form),
    onSuccess: async () => {
      await refresh()
      router.push('/dashboard')
    },
    onError: (err: any) => setError(err.message || 'Failed to create organization'),
  })

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const canContinue = () => {
    if (step === 0) return form.name.trim().length >= 2 && /^[a-z0-9-]+$/.test(form.slug)
    return true
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <Field label="Organization Name">
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Acme Corporation"
              />
            </Field>
            <Field label="Slug" hint="Lowercase letters, numbers and hyphens only">
              <Input
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="acme-corp"
              />
            </Field>
          </div>
        )
      case 1:
        return (
          <div className="space-y-5">
            <Field label="Company Description" hint="Optional">
              <Textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What does your company do?"
                rows={4}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Timezone">
                <Select value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Locale">
                <Select value={form.locale} onChange={(e) => set('locale', e.target.value)}>
                  {LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['starter', 'growth', 'enterprise'] as const).map((p) => {
              const active = form.plan === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('plan', p)}
                  className={`rounded-xl border p-5 text-left transition-all ${
                    active
                      ? 'border-violet-500 bg-violet-600/10'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-semibold text-white">{p}</span>
                    {active && <Check className="h-4 w-4 text-violet-400" />}
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    {p === 'starter'
                      ? 'Up to 5 agents, 10 concurrent calls'
                      : p === 'growth'
                        ? 'Up to 25 agents, 50 concurrent calls'
                        : 'Unlimited agents & calls'}
                  </p>
                </button>
              )
            })}
          </div>
        )
      case 3:
        return (
          <div className="space-y-3 text-sm">
            <SummaryRow label="Name" value={form.name} />
            <SummaryRow label="Slug" value={form.slug} />
            <SummaryRow label="Description" value={form.description || '—'} />
            <SummaryRow label="Timezone" value={form.timezone} />
            <SummaryRow label="Locale" value={form.locale} />
            <SummaryRow label="Plan" value={form.plan} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-10 px-4 animate-fade-in">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-violet-500/20">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Set up your workspace</h1>
        <p className="text-sm text-neutral-450 mt-1">A few details to get your call center running.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border ${
                i < step
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : i === step
                    ? 'border-violet-500 text-violet-400'
                    : 'border-neutral-700 text-neutral-500'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 ${i < step ? 'bg-violet-600' : 'bg-neutral-700'}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">{STEPS[step]}</h2>
          {renderStep()}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue()}
          >
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Finish Setup
          </Button>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold text-neutral-400">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-neutral-500">{hint}</span>}
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-800 pb-2">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-200 truncate max-w-[60%]">{value}</span>
    </div>
  )
}
