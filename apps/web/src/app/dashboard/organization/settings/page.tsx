'use client'

import { useState, ChangeEvent } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Headphones, Bot, AlertCircle, CheckCircle } from 'lucide-react'

export default function OrganizationSettingsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    maxConcurrentCalls: 10,
    maxAgents: 5,
    callRecordingEnabled: true,
    aiTtsVoiceId: '',
    aiSttProvider: 'deepgram',
    defaultCallerId: '',
    aiGreeting: '',
    aiFallbackMessage: '',
    complianceDndCheck: true,
    complianceConsentRequired: true,
  })

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch settings details
  const { isLoading } = useQuery({
    queryKey: ['orgSettings', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const data = await api.getOrganizationSettings(user.organization_id)
      setFormData({
        maxConcurrentCalls: data.maxConcurrentCalls ?? 10,
        maxAgents: data.maxAgents ?? 5,
        callRecordingEnabled: data.callRecordingEnabled ?? true,
        aiTtsVoiceId: data.aiTtsVoiceId || '',
        aiSttProvider: data.aiSttProvider || 'deepgram',
        defaultCallerId: data.defaultCallerId || '',
        aiGreeting: data.aiGreeting || '',
        aiFallbackMessage: data.aiFallbackMessage || '',
        complianceDndCheck: data.complianceDndCheck ?? true,
        complianceConsentRequired: data.complianceConsentRequired ?? true,
      })
      return data
    },
    enabled: !!user?.organization_id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!user?.organization_id) throw new Error('No organization linked')
      return api.updateOrganizationSettings(user.organization_id, data)
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['orgSettings', user?.organization_id], updatedSettings)
      setSuccessMsg('Calling configurations updated successfully')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to save settings')
      setTimeout(() => setErrorMsg(''), 4000)
    },
  })

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="h-96 bg-neutral-900/40 border border-neutral-850 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Organization Settings</h1>
        <p className="text-sm text-neutral-450 mt-1">Configure calling capacity limitations, AI agents models, and regulatory compliance rules.</p>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Box 1: Calling Capabilities */}
          <div className="p-8 rounded-xl border border-neutral-850 bg-neutral-900/30 backdrop-blur-md space-y-6">
            <h3 className="text-base font-bold text-neutral-350 border-b border-neutral-850 pb-3 flex items-center gap-2">
              <Headphones className="h-4 w-4 text-violet-400" /> Calling & Capacity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Max Concurrent Calls</label>
                <input
                  type="number"
                  name="maxConcurrentCalls"
                  value={formData.maxConcurrentCalls}
                  onChange={handleInputChange}
                  min={1}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Max Configured Agents</label>
                <input
                  type="number"
                  name="maxAgents"
                  value={formData.maxAgents}
                  onChange={handleInputChange}
                  min={1}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400">Default Caller ID (Outbound Phone)</label>
              <input
                type="text"
                name="defaultCallerId"
                value={formData.defaultCallerId}
                onChange={handleInputChange}
                placeholder="+14155550000"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-950 border border-neutral-850">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-neutral-350">Call Recording Enabled</span>
                <span className="text-[10px] text-neutral-500 mt-0.5">Record all incoming & outbound call streams</span>
              </div>
              <input
                type="checkbox"
                name="callRecordingEnabled"
                checked={formData.callRecordingEnabled}
                onChange={handleInputChange}
                className="h-4 w-4 accent-violet-650 cursor-pointer"
              />
            </div>
          </div>

          {/* Box 2: Compliance Setup */}
          <div className="p-8 rounded-xl border border-neutral-850 bg-neutral-900/30 backdrop-blur-md space-y-6">
            <h3 className="text-base font-bold text-neutral-350 border-b border-neutral-850 pb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-violet-400" /> Regulatory & Compliance
            </h3>

            <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-950 border border-neutral-850">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-neutral-350">DND (Do Not Call) Registry Check</span>
                <span className="text-[10px] text-neutral-500 mt-0.5">Enforce scrubbing against DND registry list before dialing</span>
              </div>
              <input
                type="checkbox"
                name="complianceDndCheck"
                checked={formData.complianceDndCheck}
                onChange={handleInputChange}
                className="h-4 w-4 accent-violet-650 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-950 border border-neutral-850">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-neutral-350">Recording Consent Disclosure</span>
                <span className="text-[10px] text-neutral-500 mt-0.5">Mandate consent disclosure within first 5 seconds of the call</span>
              </div>
              <input
                type="checkbox"
                name="complianceConsentRequired"
                checked={formData.complianceConsentRequired}
                onChange={handleInputChange}
                className="h-4 w-4 accent-violet-650 cursor-pointer"
              />
            </div>
          </div>

          {/* Box 3: AI Defaults Configuration */}
          <div className="lg:col-span-2 p-8 rounded-xl border border-neutral-850 bg-neutral-900/30 backdrop-blur-md space-y-6">
            <h3 className="text-base font-bold text-neutral-350 border-b border-neutral-850 pb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-violet-400" /> Default AI Speech & Script Models
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Default TTS Voice ID</label>
                <input
                  type="text"
                  name="aiTtsVoiceId"
                  value={formData.aiTtsVoiceId}
                  onChange={handleInputChange}
                  placeholder="e.g. elevenlabs_aria_voice"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400">Default STT Provider</label>
                <select
                  name="aiSttProvider"
                  value={formData.aiSttProvider}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none transition-colors"
                >
                  <option value="deepgram">Deepgram (Recommended)</option>
                  <option value="google">Google Cloud STT</option>
                  <option value="whisper">OpenAI Whisper</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400">AI Call Greeting Phrase</label>
              <textarea
                name="aiGreeting"
                value={formData.aiGreeting}
                onChange={handleInputChange}
                placeholder="Welcome to RDS support. How can I assist you today?"
                rows={3}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400">AI Call Fallback message</label>
              <textarea
                name="aiFallbackMessage"
                value={formData.aiFallbackMessage}
                onChange={handleInputChange}
                placeholder="I'm having trouble understanding. Let me connect you to a human agent."
                rows={3}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
