'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building,
  Settings,
  ShieldAlert,
  Wallet,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Users,
  KeyRound,
  ShieldCheck,
  Megaphone,
  Contact,
  Brain,
  PhoneCall,
  Radio,
  Headphones,
  CreditCard,
  CalendarClock,
  Settings2,
  Webhook,
  Boxes,
  Bell,
  ScrollText,
  Scale,
  Activity,
  Database,
  Gauge,
  Server,
  Globe2,
  Workflow,
  Flag,
  Bot,
  MessageSquareText,
  LayoutList,
  Tag,
  Ticket,
  Receipt,
  HeartPulse,
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { TourProvider } from '@/components/Tour'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, logout } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const order = ['system', 'dark', 'light'] as const
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  // Fetch current organization details if organization_id is available
  const { data: org } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: () => (user?.organization_id ? api.getOrganization(user.organization_id) : null),
    enabled: !!user?.organization_id,
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!loading && user && !user.organization_id && pathname !== '/dashboard/onboarding') {
      router.push('/dashboard/onboarding')
    }
  }, [user, loading, pathname, router])

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-radial from-neutral-900 to-neutral-950 text-white">
        <div className="space-y-4 text-center">
          <div className="relative h-12 w-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 border-neutral-700 animate-spin"></div>
          </div>
          <p className="text-neutral-400 font-medium">Verifying Session...</p>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user.roles.includes('super_admin')

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: 'nav-dashboard' },
    ...(user.organization_id
      ? [
          { name: 'Org Profile', href: '/dashboard/organization/profile', icon: Building, tourId: 'nav-profile' },
          { name: 'Org Settings', href: '/dashboard/organization/settings', icon: Settings, tourId: 'nav-orgsettings' },
          { name: 'Users', href: '/dashboard/organization/users', icon: Users, tourId: 'nav-users' },
          { name: 'API Keys', href: '/dashboard/organization/api-keys', icon: KeyRound, tourId: 'nav-apikeys' },
          { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone, tourId: 'nav-campaigns' },
          { name: 'Agents', href: '/dashboard/agents', icon: Bot, tourId: 'nav-agents' },
          { name: 'Contact Lists', href: '/dashboard/contact-lists', icon: LayoutList, tourId: 'nav-contact-lists' },
          { name: 'Contacts', href: '/dashboard/contacts', icon: Contact, tourId: 'nav-contacts' },
          { name: 'Calls', href: '/dashboard/calls', icon: PhoneCall, tourId: 'nav-calls' },
          { name: 'Live', href: '/dashboard/live', icon: Radio, tourId: 'nav-live' },
          { name: 'Live Monitor', href: '/dashboard/live-monitor', icon: Activity, tourId: 'nav-live-monitor' },
          { name: 'Agent', href: '/dashboard/agent', icon: Headphones, tourId: 'nav-agent' },
          { name: 'Billing', href: '/dashboard/billing', icon: CreditCard, tourId: 'nav-billing' },
          { name: 'Plans', href: '/dashboard/plans', icon: Tag, tourId: 'nav-plans' },
          { name: 'Coupons', href: '/dashboard/coupons', icon: Ticket, tourId: 'nav-coupons' },
          { name: 'Credits', href: '/dashboard/credits', icon: Wallet, tourId: 'nav-credits' },
          { name: 'Billing Settings', href: '/dashboard/billing-settings', icon: Settings2, tourId: 'nav-billing-settings' },
          { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt, tourId: 'nav-transactions' },
          { name: 'Subscription', href: '/dashboard/subscription', icon: CalendarClock, tourId: 'nav-subscription' },
          { name: 'Integrations', href: '/dashboard/integrations', icon: Boxes, tourId: 'nav-integrations' },
          { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook, tourId: 'nav-webhooks' },
          { name: 'API Keys', href: '/dashboard/api-keys', icon: KeyRound, tourId: 'nav-api-keys' },
          { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, tourId: 'nav-notifications' },
          { name: 'Audit Logs', href: '/dashboard/audit', icon: ScrollText, tourId: 'nav-audit' },
          { name: 'Compliance', href: '/dashboard/compliance', icon: Scale, tourId: 'nav-compliance' },
          { name: 'Monitoring', href: '/dashboard/observability', icon: Activity, tourId: 'nav-observability' },
          { name: 'System Health', href: '/dashboard/system-health', icon: HeartPulse, tourId: 'nav-system-health' },
          { name: 'Cost Center', href: '/dashboard/cost', icon: Wallet, tourId: 'nav-cost' },
          { name: 'Backups', href: '/dashboard/backup', icon: Database, tourId: 'nav-backup' },
          { name: 'Performance', href: '/dashboard/performance', icon: Gauge, tourId: 'nav-performance' },
          { name: 'Auto Scaling', href: '/dashboard/scaling', icon: Server, tourId: 'nav-scaling' },
          { name: 'Regions', href: '/dashboard/regions', icon: Globe2, tourId: 'nav-regions' },
          { name: 'Queues', href: '/dashboard/queues', icon: Workflow, tourId: 'nav-queues' },
          { name: 'Feature Flags', href: '/dashboard/feature-flags', icon: Flag, tourId: 'nav-feature-flags' },
          { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquareText, tourId: 'nav-conversations' },
          { name: 'Voice Providers', href: '/dashboard/voice-providers', icon: Headphones, tourId: 'nav-voice-providers' },
          { name: 'Provider Settings', href: '/dashboard/voice-providers/settings', icon: Settings2, tourId: 'nav-voice-settings' },
{ name: 'Provider Health', href: '/dashboard/voice-providers/health', icon: Activity, 
tourId: 'nav-voice-health' },
          { name: 'Streaming', href: '/dashboard/voice-providers/streaming', icon: Headphones, 
tourId: 'nav-voice-streaming' },
          { name: 'Provider Selection', href: '/dashboard/voice-providers/selection', icon: Settings2, 
tourId: 'nav-voice-selection' },
          { name: 'Voice Library', href: '/dashboard/voice-library', icon: Headphones, 
tourId: 'nav-voice-library' },
          { name: 'Call Execution', href: '/dashboard/call-execution', icon: PhoneCall, 
tourId: 'nav-call-execution' },
          { name: 'AI Intelligence', href: '/dashboard/ai-calling', icon: Brain, tourId: 'nav-ai-intelligence' },
          { name: 'Settings', href: '/dashboard/settings', icon: Settings2, tourId: 'nav-settings' },
          { name: 'Settings', href: '/dashboard/settings', icon: Settings2, tourId: 'nav-settings' },
          { name: 'Security', href: '/dashboard/security', icon: ShieldCheck, tourId: 'nav-security' },
        ]
      : []),
    ...(isSuperAdmin
      ? [{ name: 'Organizations (Admin)', href: '/dashboard/organizations', icon: ShieldAlert, tourId: 'nav-orgs' }]
      : []),
  ]

  const orgLogo = (org as any)?.branding?.logoUrl

  return (
    <TourProvider>
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-violet-600/30">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-neutral-800 bg-neutral-900/40 backdrop-blur-xl">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo Brand Header */}
          <div className="flex items-center px-6 py-2 gap-3 border-b border-neutral-800/60 pb-5">
            {orgLogo ? (
              <img src={orgLogo} alt="Logo" className="h-9 w-9 rounded-lg object-contain bg-neutral-800 p-1 border border-neutral-700" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 font-bold text-white shadow-md shadow-violet-500/20">
                RDS
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-300 truncate">
                {org?.name || 'RDS Call Centre'}
              </span>
              <span className="text-[10px] text-neutral-500 truncate">
                {isSuperAdmin ? 'Super Owner' : 'Org Admin Portal'}
              </span>
            </div>
          </div>

          {/* User Profile Card Summary */}
          <div className="px-4 py-4 mx-3 my-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-neutral-800 flex items-center justify-center text-violet-400 font-bold border border-neutral-750">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-neutral-200 truncate">{user.full_name}</span>
              <span className="text-[10px] text-neutral-500 truncate">{user.email}</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-3 space-y-1" data-tour-id="nav">
            {navigation.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  data-tour-id={item.tourId}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-violet-600/15 to-indigo-600/10 text-violet-400 border-l-2 border-violet-500'
                      : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-4 w-4 flex-shrink-0 transition-colors ${
                      active ? 'text-violet-400' : 'text-neutral-500 group-hover:text-neutral-300'
                    }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="flex-shrink-0 flex border-t border-neutral-800 p-4">
          <button
            onClick={handleLogout}
            className="group flex items-center w-full px-3 py-2.5 text-sm font-medium text-neutral-400 rounded-lg hover:bg-neutral-800/50 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="mr-3 h-4 w-4 text-neutral-500 group-hover:text-red-400 transition-colors" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-neutral-900 border-r border-neutral-800 pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex items-center px-6 py-2 gap-3 border-b border-neutral-800 pb-5">
              {orgLogo ? (
                <img src={orgLogo} alt="Logo" className="h-8 w-8 rounded-lg object-contain bg-neutral-850" loading="lazy" decoding="async" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 font-bold text-white shadow-md">
                  RDS
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-neutral-200 truncate">{org?.name || 'RDS Call Centre'}</span>
                <span className="text-[10px] text-neutral-500">{isSuperAdmin ? 'Super Owner' : 'Org Admin Portal'}</span>
              </div>
            </div>

            <nav className="mt-5 flex-shrink-0 h-full px-2 space-y-1 overflow-y-auto" data-tour-id="nav">
              {navigation.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    data-tour-id={item.tourId}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${
                      active ? 'bg-neutral-800 text-violet-400' : 'text-neutral-400 hover:bg-neutral-800/40'
                    }`}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
              <button
                onClick={handleLogout}
                className="group flex items-center w-full px-3 py-2.5 text-sm font-medium text-neutral-400 rounded-lg hover:bg-neutral-800/40 hover:text-red-400 mt-4 border-t border-neutral-800/60 pt-4"
              >
                <LogOut className="mr-3 h-4 w-4 text-neutral-500 group-hover:text-red-400" />
                Sign out
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col md:pl-64 flex-1">
        {/* Header Mobile Toggle & Profile Dropdown */}
        <header className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-neutral-950/60 backdrop-blur-md border-b border-neutral-800 px-4 md:px-8 justify-between items-center">
          <button
            type="button"
            className="px-4 border-r border-neutral-800 text-neutral-400 focus:outline-none md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Breadcrumb Info */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
            <span>Portal</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-neutral-300 capitalize">
              {pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Home'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={cycleTheme}
              title={`Theme: ${theme}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-violet-400 transition-colors"
              aria-label="Toggle theme"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
            <span className="hidden sm:inline text-xs text-neutral-400">
              Welcome back, <span className="font-semibold text-neutral-200">{user.full_name}</span>
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 py-8 px-4 md:px-8 max-w-6xl w-full mx-auto pb-16">
          {children}
        </main>
      </div>
    </div>
    </TourProvider>
  )
}
