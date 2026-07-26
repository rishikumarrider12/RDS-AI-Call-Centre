'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  useToast,
  ErrorState,
} from '@rds/ui'
import { Save, Loader2 } from 'lucide-react'
import type { BillingSettings } from '@rds/types'

export default function BillingSettingsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['billingSettings', orgId],
    queryFn: () => api.getBillingSettings(),
    enabled: !!orgId,
  })

  const settings = data?.settings as BillingSettings | null

  const [autoRecharge, setAutoRecharge] = useState(false)
  const [autoRechargeThreshold, setAutoRechargeThreshold] = useState('')
  const [autoRechargeAmount, setAutoRechargeAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [billingEmail, setBillingEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address, setAddress] = useState('{}')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['billingSettings', orgId] })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateBillingSettings({
        autoRecharge,
        autoRechargeThreshold: autoRechargeThreshold ? Number(autoRechargeThreshold) : null,
        autoRechargeAmount: autoRechargeAmount ? Number(autoRechargeAmount) : null,
        currency,
        billingEmail: billingEmail || null,
        companyName: companyName || null,
        taxId: taxId || null,
        address: (() => { try { return JSON.parse(address) } catch { return {} } })(),
        notificationPreferences: (() => { try { return JSON.parse(address) } catch { return {} } })(),
      }),
    onSuccess: () => {
      invalidate()
      toast('Billing settings saved', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to save settings', 'error'),
  })

  useState(() => {
    if (settings) {
      setAutoRecharge(settings.autoRecharge)
      setAutoRechargeThreshold(settings.autoRechargeThreshold?.toString() || '')
      setAutoRechargeAmount(settings.autoRechargeAmount?.toString() || '')
      setCurrency(settings.currency)
      setBillingEmail(settings.billingEmail || '')
      setCompanyName(settings.companyName || '')
      setTaxId(settings.taxId || '')
      setAddress(JSON.stringify(settings.address || {}))
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Billing Settings</h1>
        <p className="text-sm text-neutral-450 mt-1">Configure billing preferences, payment methods, and notifications.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading settings…
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load billing settings'} onRetry={() => refetch()} />
      ) : (
        <Card>
          <CardContent className="p-6 space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Auto Recharge</p>
                <p className="text-xs text-neutral-500">Automatically add credits when balance drops below threshold.</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoRecharge(!autoRecharge)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRecharge ? 'bg-violet-600' : 'bg-neutral-800'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRecharge ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {autoRecharge && (
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-neutral-400">Threshold</span>
                  <Input type="number" value={autoRechargeThreshold} onChange={(e) => setAutoRechargeThreshold(e.target.value)} placeholder="50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-neutral-400">Recharge Amount</span>
                  <Input type="number" value={autoRechargeAmount} onChange={(e) => setAutoRechargeAmount(e.target.value)} placeholder="100" />
                </label>
              </div>
            )}

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Currency</span>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Billing Email</span>
              <Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="billing@example.com" />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Company Name</span>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc" />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Tax ID</span>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="US-XXXXXXX" />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Address (JSON)</span>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={4} placeholder='{"line1": "123 Main St", "city": "NYC"}' />
            </label>

            <div className="pt-4">
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
