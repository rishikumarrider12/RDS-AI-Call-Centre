'use client'

import { useState, ChangeEvent } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building, Upload, AlertCircle, CheckCircle } from 'lucide-react'

export default function OrganizationProfilePage() {
  const { user } = useSession()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    timezone: 'UTC',
    locale: 'en-US',
  })
  const [logoFile, setLogoFile] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch organization details
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const data = await api.getOrganization(user.organization_id)
      setFormData({
        name: data.name,
        slug: data.slug,
        timezone: (data as any).timezone || 'UTC',
        locale: (data as any).locale || 'en-US',
      })
      return data
    },
    enabled: !!user?.organization_id,
  })

  // Update details mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!user?.organization_id) throw new Error('No organization linked')
      return api.updateOrganization(user.organization_id, data)
    },
    onSuccess: (updatedOrg) => {
      queryClient.setQueryData(['organization', user?.organization_id], updatedOrg)
      setSuccessMsg('Profile details updated successfully')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update organization details')
      setTimeout(() => setErrorMsg(''), 4000)
    },
  })

  // Logo upload mutation
  const logoMutation = useMutation({
    mutationFn: (base64Logo: string) => {
      if (!user?.organization_id) throw new Error('No organization linked')
      return api.uploadOrganizationLogo(user.organization_id, base64Logo)
    },
    onSuccess: (updatedOrg) => {
      queryClient.setQueryData(['organization', user?.organization_id], updatedOrg)
      setSuccessMsg('Logo updated successfully')
      setLogoFile(null)
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to upload logo')
      setTimeout(() => setErrorMsg(''), 4000)
    },
  })

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Logo size should be less than 2MB')
      setTimeout(() => setErrorMsg(''), 4000)
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setLogoFile(result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleLogoUpload = () => {
    if (logoFile) {
      logoMutation.mutate(logoFile)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="h-96 bg-neutral-900/40 border border-neutral-850 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-6 flex gap-4 text-red-400">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div>
          <h3 className="font-bold">No Organization Linked</h3>
          <p className="text-sm mt-1">Please contact your administrator to set up your workspace organization.</p>
        </div>
      </div>
    )
  }

  const brandingLogo = (org as any).branding?.logoUrl

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Organization Profile</h1>
        <p className="text-sm text-neutral-450 mt-1">Update your workspace brand identifiers, locale preferences, and details.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: General Profile Form */}
        <div className="lg:col-span-2 p-8 rounded-xl border border-neutral-850 bg-neutral-900/30 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-base font-bold text-neutral-350 border-b border-neutral-850 pb-3 flex items-center gap-2">
              <Building className="h-4 w-4" /> General Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Organization Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Timezone</label>
                <select
                  name="timezone"
                  value={formData.timezone}
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

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Locale</label>
                <select
                  name="locale"
                  value={formData.locale}
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
            </div>

            <div className="flex gap-4 border-t border-neutral-850 pt-6">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Branding Logo Upload */}
        <div className="p-8 rounded-xl border border-neutral-850 bg-neutral-900/30 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-base font-bold text-neutral-350 border-b border-neutral-850 pb-3">
              Branding & Logo
            </h3>

            <div className="space-y-4 text-center">
              <div className="relative mx-auto h-32 w-32 rounded-xl border border-neutral-800 bg-neutral-950 flex items-center justify-center overflow-hidden group">
                {logoFile ? (
                  <img src={logoFile} alt="Preview" className="h-full w-full object-contain p-2" loading="lazy" decoding="async" />
                ) : brandingLogo ? (
                  <img src={brandingLogo} alt="Logo" className="h-full w-full object-contain p-2" loading="lazy" decoding="async" />
                ) : (
                  <Building className="h-10 w-10 text-neutral-600" />
                )}
              </div>

              <div className="flex flex-col items-center">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-350 hover:bg-neutral-800 transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  Select File
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
                <span className="text-[10px] text-neutral-500 mt-2">Max limit: 2MB. Supports PNG, JPG, WebP.</span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-850 pt-6 mt-6">
            <button
              onClick={handleLogoUpload}
              disabled={!logoFile || logoMutation.isPending}
              className="w-full rounded-lg bg-neutral-800 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-750 active:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              {logoMutation.isPending ? 'Uploading...' : 'Upload Logo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
