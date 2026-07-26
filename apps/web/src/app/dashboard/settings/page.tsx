'use client'

import Link from 'next/link'
import { useTour } from '@/components/Tour'
import { useSession } from '@/hooks/useSession'
import { Card, CardContent, Button, useToast } from '@rds/ui'
import {
  Settings2,
  Sparkles,
  Building,
  ShieldCheck,
  KeyRound,
  Users,
  Webhook,
  Boxes,
  Bell,
  ScrollText,
  ExternalLink,
} from 'lucide-react'

export default function SettingsPage() {
  const { restartTour } = useTour()
  const { user } = useSession()
  const { toast } = useToast()

  const quickLinks: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
    { name: 'Organization Settings', href: '/dashboard/organization/settings', icon: Building, desc: 'Calling capacity, AI models and compliance rules' },
    { name: 'Users', href: '/dashboard/organization/users', icon: Users, desc: 'Manage members, roles and access' },
    { name: 'API Keys', href: '/dashboard/organization/api-keys', icon: KeyRound, desc: 'Programmatic access credentials' },
    { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook, desc: 'Receive real-time event notifications' },
    { name: 'Integrations', href: '/dashboard/integrations', icon: Boxes, desc: 'Connect CRMs, messaging and analytics' },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, desc: 'Inbox and delivery preferences' },
    { name: 'Audit Logs', href: '/dashboard/audit', icon: ScrollText, desc: 'Immutable record of actions' },
    { name: 'Security', href: '/dashboard/security', icon: ShieldCheck, desc: 'Two-factor authentication' },
  ]

  const handleRestart = () => {
    restartTour()
    toast('Tour started', 'info')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-violet-400" /> Settings
        </h1>
        <p className="text-sm text-neutral-450 mt-1">Manage your workspace configuration and preferences.</p>
      </div>

      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-600/10 text-violet-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Product Tour</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                New here? Walk through the console with a guided, interactive tour.
              </p>
            </div>
          </div>
          <Button onClick={handleRestart}>
            <Sparkles className="h-4 w-4" /> Restart Tour
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 flex items-center gap-4 hover:border-violet-500/40 hover:bg-neutral-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-violet-400">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{link.name}</p>
                <p className="text-xs text-neutral-500 truncate">{link.desc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-neutral-600 group-hover:text-violet-400 transition-colors" />
            </Link>
          )
        })}
      </div>

      <p className="text-xs text-neutral-600">
        Signed in as <span className="text-neutral-400">{user?.email}</span>.
      </p>
    </div>
  )
}
