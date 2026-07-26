'use client'

import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Building, Settings, ShieldAlert, ArrowUpRight, Activity, Users, PhoneCall } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useSession()

  const { data: org } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: () => (user?.organization_id ? api.getOrganization(user.organization_id) : null),
    enabled: !!user?.organization_id,
  })

  const isSuperAdmin = user?.roles.includes('super_admin')

  // Sample analytics display values (since we are not implementing calling engine yet)
  const stats = [
    { name: 'Active Agents', value: '0 / 5', icon: Users, desc: 'Allocated in plan' },
    { name: 'Concurrent Calls', value: '0 / 10', icon: PhoneCall, desc: 'Current traffic' },
    { name: 'API Status', value: 'Operational', icon: Activity, desc: 'Latency: 12ms' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.1),transparent_40%)]" />
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400 border border-violet-500/20">
            System Online
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome, {user?.full_name || 'User'}
          </h1>
          <p className="text-neutral-400 max-w-xl text-sm leading-relaxed">
            Manage your AI call center workspace, fine-tune voice configurations, and analyze metrics from a single premium portal.
          </p>
        </div>
      </div>

      {/* Organization Info Snapshot */}
      {org && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-neutral-850 bg-neutral-900/20 backdrop-blur-md space-y-3">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Organization</span>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-600/10 rounded-lg text-violet-400 border border-violet-500/20">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base truncate">{org.name}</h3>
                <p className="text-xs text-neutral-450 truncate">slug: {org.slug}</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-neutral-850 bg-neutral-900/20 backdrop-blur-md space-y-3">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Active Plan</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white capitalize">{org.plan}</span>
              <span className="text-xs text-violet-400 font-medium">Enterprise Grade</span>
            </div>
            <p className="text-[11px] text-neutral-500">Subject to standard workspace quotas</p>
          </div>

          <div className="p-6 rounded-xl border border-neutral-850 bg-neutral-900/20 backdrop-blur-md space-y-3">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Location & Timezone</span>
            <div className="text-white font-bold text-base truncate">{(org as any).timezone}</div>
            <p className="text-xs text-neutral-450 truncate">Default Locale: {(org as any).locale}</p>
          </div>
        </div>
      )}

      {/* Analytics stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 rounded-xl border border-neutral-850 bg-neutral-900/40 relative group overflow-hidden transition-all duration-200 hover:border-neutral-750">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent_30%)]" />
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 font-medium">{stat.name}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
              <div className="p-2.5 bg-neutral-800 rounded-lg text-neutral-400 group-hover:text-violet-400 group-hover:bg-violet-950/20 transition-all duration-200 border border-neutral-700/60">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-[11px] text-neutral-500 flex items-center gap-1.5 relative z-10 border-t border-neutral-800/40 pt-3">
              <span>{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {user?.organization_id && (
            <>
              <Link
                href="/dashboard/organization/profile"
                className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/20 hover:bg-neutral-900/50 hover:border-neutral-700 transition-all duration-200 flex justify-between items-center text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300 group-hover:text-violet-400 transition-colors">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-200 group-hover:text-white">Organization Profile</h4>
                    <p className="text-xs text-neutral-500">Edit profile details & upload logo</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-neutral-600 group-hover:text-violet-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              <Link
                href="/dashboard/organization/settings"
                className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/20 hover:bg-neutral-900/50 hover:border-neutral-700 transition-all duration-200 flex justify-between items-center text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300 group-hover:text-violet-400 transition-colors">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-200 group-hover:text-white">Calling Settings</h4>
                    <p className="text-xs text-neutral-500">Manage limits & compliance rules</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-neutral-600 group-hover:text-violet-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </>
          )}

          {isSuperAdmin && (
            <Link
              href="/dashboard/organizations"
              className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/20 hover:bg-neutral-900/50 hover:border-neutral-700 transition-all duration-200 flex justify-between items-center text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300 group-hover:text-violet-400 transition-colors">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-200 group-hover:text-white">Admin Console</h4>
                  <p className="text-xs text-neutral-500">Manage all tenant organizations</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-neutral-600 group-hover:text-violet-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
