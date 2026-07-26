'use client'

import { useState, ChangeEvent } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Building, AlertCircle, CheckCircle, Globe, Layers } from 'lucide-react'

export default function AdminOrganizationsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    plan: 'starter' as 'starter' | 'growth' | 'enterprise',
    timezone: 'UTC',
    locale: 'en-US',
  })

  // Fetch all organizations
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['adminOrganizations'],
    queryFn: () => api.getOrganizations(),
    enabled: !!user?.roles.includes('super_admin'),
  })

  // Create organization mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof newOrg) => api.createOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrganizations'] })
      setModalOpen(false)
      setNewOrg({
        name: '',
        slug: '',
        plan: 'starter',
        timezone: 'UTC',
        locale: 'en-US',
      })
      setSuccessMsg('Organization created successfully with default settings')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create organization')
      setTimeout(() => setErrorMsg(''), 4000)
    },
  })

  // Soft delete organization mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.softDeleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrganizations'] })
      setSuccessMsg('Organization soft deleted successfully')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to soft delete organization')
      setTimeout(() => setErrorMsg(''), 4000)
    },
  })

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewOrg((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(newOrg)
  }

  const handleDeleteClick = (id: string, name: string) => {
    if (confirm(`Are you sure you want to soft delete organization "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const isSuperAdmin = user?.roles.includes('super_admin')

  if (!isSuperAdmin) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-6 flex gap-4 text-red-400">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div>
          <h3 className="font-bold">Access Denied</h3>
          <p className="text-sm mt-1">Only Super Admins can access this organization administration panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">System Workspaces</h1>
          <p className="text-sm text-neutral-450 mt-1">Super Admin Panel — Manage all organizations, plans, and workspace boundaries.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 hover:brightness-110 active:brightness-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex gap-3 text-emerald-400 items-center">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 items-center">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Organizations Table */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-12 w-full bg-neutral-900 border border-neutral-850 rounded-lg animate-pulse" />
          <div className="h-48 w-full bg-neutral-900/60 border border-neutral-850 rounded-lg animate-pulse" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="p-12 text-center border border-neutral-850 rounded-xl bg-neutral-900/10">
          <Building className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="font-semibold text-neutral-350">No workspaces found</h3>
          <p className="text-sm text-neutral-500 mt-1">Get started by creating the first system workspace organization.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-850 bg-neutral-900/10 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-850 bg-neutral-900/60 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <th className="p-4 pl-6">Name</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Billing Plan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Timezone / Locale</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850 text-sm">
              {orgs.map((org: any) => (
                <tr key={org.id} className="hover:bg-neutral-900/40 transition-colors">
                  <td className="p-4 pl-6 font-semibold text-white flex items-center gap-3">
                    {org.branding?.logoUrl ? (
                      <img src={org.branding.logoUrl} alt="" className="h-7 w-7 rounded object-contain bg-neutral-850 p-0.5 border border-neutral-800" loading="lazy" decoding="async" />
                    ) : (
                      <div className="h-7 w-7 rounded bg-violet-600/15 border border-violet-500/20 flex items-center justify-center text-violet-400 font-black text-xs">
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span>{org.name}</span>
                  </td>
                  <td className="p-4 text-neutral-400 font-mono text-xs">{org.slug}</td>
                  <td className="p-4 capitalize">
                    <span className="inline-flex items-center gap-1.5 rounded bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400 border border-violet-500/10">
                      <Layers className="h-3 w-3" />
                      {org.plan}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
                      org.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : org.status === 'suspended'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="p-4 text-neutral-450 space-y-0.5">
                    <div className="flex items-center gap-1 text-xs">
                      <Globe className="h-3 w-3 text-neutral-500" />
                      <span>{org.timezone}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500">locale: {org.locale}</div>
                  </td>
                  <td className="p-4 pr-6 text-right space-x-1.5">
                    <button
                      onClick={() => handleDeleteClick(org.id, org.name)}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 transition-colors"
                      title="Soft Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-855 flex justify-between items-center bg-neutral-950/40">
              <h3 className="text-lg font-bold text-white">Create New Organization</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Organization Name</label>
                <input
                  type="text"
                  name="name"
                  value={newOrg.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Acme Corp"
                  required
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={newOrg.slug}
                  onChange={handleInputChange}
                  placeholder="e.g. acme-corp"
                  required
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-400">Billing Plan</label>
                  <select
                    name="plan"
                    value={newOrg.plan}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none transition-colors"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-400">Default Timezone</label>
                  <select
                    name="timezone"
                    value={newOrg.timezone}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none transition-colors"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">EST (America/New_York)</option>
                    <option value="America/Chicago">CST (America/Chicago)</option>
                    <option value="America/Los_Angeles">PST (America/Los_Angeles)</option>
                    <option value="Europe/London">GMT (Europe/London)</option>
                    <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                    <option value="Asia/Singapore">SGT (Asia/Singapore)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Default Locale</label>
                <select
                  name="locale"
                  value={newOrg.locale}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none transition-colors"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="fr-FR">French (France)</option>
                  <option value="de-DE">German (Germany)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end border-t border-neutral-855 pt-5 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-neutral-350 hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Org'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
