'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { Card, CardContent, Badge, Button, useToast } from '@rds/ui'
import { ShieldCheck, ShieldAlert, QrCode, Copy, Check, KeyRound } from 'lucide-react'

const MOCK_RECOVERY = ['rds-1a2b-3c4d', 'rds-5e6f-7g8h', 'rds-9i0j-1k2l', 'rds-3m4n-5o6p']

export default function SecurityPage() {
  const { user } = useSession()
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [copied, setCopied] = useState(false)

  const toggle = (next: boolean) => {
    setEnabled(next)
    toast(next ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled', next ? 'success' : 'info')
  }

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_RECOVERY.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy to clipboard', 'error')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Security</h1>
        <p className="text-sm text-neutral-450 mt-1">Protect your account with two-factor authentication.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {enabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-neutral-500">Require a time-based code at login.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={enabled ? 'success' : 'warning'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
              <Button variant={enabled ? 'outline' : 'default'} onClick={() => toggle(!enabled)}>
                {enabled ? 'Disable' : 'Enable'} 2FA
              </Button>
            </div>
          </div>

          {enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-neutral-800">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-neutral-400">Authenticator QR Code</span>
                <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-neutral-950 text-neutral-600">
                  <div className="text-center">
                    <QrCode className="h-10 w-10 mx-auto" />
                    <span className="block text-[10px] mt-2 px-4">QR placeholder</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Scan this code with an authenticator app (placeholder — provider wiring is a later phase).
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400">Recovery Codes</span>
                  <button
                    type="button"
                    onClick={copyCodes}
                    className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                  {MOCK_RECOVERY.map((code) => (
                    <div key={code} className="flex items-center gap-2 text-sm text-neutral-300 font-mono">
                      <KeyRound className="h-3.5 w-3.5 text-neutral-500" />
                      {code}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-500">Store these safely. Each code works once (placeholder).</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-neutral-600">
        Signed in as <span className="text-neutral-400">{user?.email}</span>.
      </p>
    </div>
  )
}
