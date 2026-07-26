'use client'

import { useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Input,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  EmptyState,
  ErrorState,
  LoadingState,
  useToast,
} from '@rds/ui'
import {
  Headphones,
  RefreshCw,
  Search,
  Filter,
  Play,
  Star,
  StarOff,
  Loader2,
  Volume2,
} from 'lucide-react'
import type { VoiceModel } from '@rds/types'

type SortField = 'name' | 'language' | 'gender' | 'provider' | 'type'
type SortDirection = 'asc' | 'desc'

export default function VoiceLibraryPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [previewVoice, setPreviewVoice] = useState<VoiceModel | null>(null)
  const [previewText, setPreviewText] = useState('Hello, this is a voice preview.')
  const [isPreviewing, setIsPreviewing] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['voice-library', { search, providerFilter, typeFilter, languageFilter, genderFilter }],
    queryFn: () =>
      api.listVoices({
        providerKey: providerFilter !== 'all' ? providerFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        language: languageFilter !== 'all' ? languageFilter : undefined,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
      }),
    placeholderData: (previousData) => previousData,
  })

  const providersQuery = useQuery({
    queryKey: ['voice-providers'],
    queryFn: () => api.listVoiceProviders(),
  })

  const providers = providersQuery.data?.providers ?? []
  const voices = data?.voices ?? []

  const { mutate: discoverVoices, isPending: isDiscovering } = useMutation({
    mutationFn: () => api.discoverVoices(),
    onSuccess: () => {
      toast('Voice discovery started', 'success')
      queryClient.invalidateQueries({ queryKey: ['voice-library'] })
      queryClient.invalidateQueries({ queryKey: ['voice-providers'] })
    },
    onError: (err: any) => toast(err.message || 'Voice discovery failed', 'error'),
  })

  const { mutate: setDefaultVoice, isPending: isSettingDefault } = useMutation({
    mutationFn: (voiceId: string) =>
      api.updateVoice(voiceId, { metadata: { ...(voices.find((v) => v.id === voiceId)?.metadata ?? {}), isDefault: true } }),
    onSuccess: () => {
      toast('Default voice set', 'success')
      queryClient.invalidateQueries({ queryKey: ['voice-library'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to set default voice', 'error'),
  })

  const { mutate: previewAudio, isPending: isPreviewingAudio } = useMutation({
    mutationFn: async (voice: VoiceModel) => {
      setIsPreviewing(true)
      try {
        const providerKey = voice.providerKey
        const stream = await api.streamAudio(providerKey, previewText, voice.modelId)
        const reader = stream.getReader()
        const chunks: Uint8Array[] = []
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
          }
        } finally {
          reader.releaseLock()
        }
        const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          combined.set(chunk, offset)
          offset += chunk.length
        }
        const blob = new Blob([combined], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        // eslint-disable-next-line no-undef
        const audio = new Audio(url)
        audio.play()
        audio.onended = () => {
          setIsPreviewing(false)
          URL.revokeObjectURL(url)
        }
      } catch (err) {
        setIsPreviewing(false)
        toast('Preview failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error')
      }
    },
  })

  const filteredVoices = useMemo(() => {
    let result = [...voices]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.modelId.toLowerCase().includes(q) ||
          v.language.toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'language':
          comparison = a.language.localeCompare(b.language)
          break
        case 'gender':
          comparison = (a.gender ?? '').localeCompare(b.gender ?? '')
          break
        case 'provider':
          comparison = a.providerKey.localeCompare(b.providerKey)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return result
  }, [voices, search, sortField, sortDirection])

  const uniqueLanguages = useMemo(
    () => [...new Set(voices.map((v) => v.language))].sort(),
    [voices]
  )

  const isLoadingData = isLoading || providersQuery.isLoading

  if (isError) {
    return (
      <ErrorState message="Failed to load voice library" onRetry={() => refetch()} />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Headphones className="h-6 w-6 text-violet-400" /> Voice Library
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Discover, manage, and preview voice models from your providers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => discoverVoices()} disabled={isDiscovering}>
            {isDiscovering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Filter className="h-4 w-4 mr-2" />
            )}
            Discover All
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  placeholder="Search voices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">All Providers</option>
              {providers.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="tts">TTS</option>
              <option value="stt">STT</option>
            </select>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">All Languages</option>
              {uniqueLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoadingData ? (
        <LoadingState label="Loading voice library..." />
      ) : filteredVoices.length === 0 ? (
        <EmptyState
          icon={<Headphones className="h-7 w-7" />}
          title="No voices found"
          description={
            search || providerFilter !== 'all'
              ? 'No voices match your current filters. Try adjusting your search or filters.'
              : 'No voices discovered yet. Click Discover All to fetch voices from your providers.'
          }
          action={
            <Button size="sm" onClick={() => discoverVoices()} disabled={isDiscovering}>
              <Filter className="h-4 w-4 mr-2" />
              Discover Voices
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Voices</span>
              <span className="text-sm font-normal text-neutral-400">
                {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''}
              </span>
            </CardTitle>
            <CardDescription>
              Click a voice to preview or set as default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVoices.map((voice) => (
                <div
                  key={voice.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-4 space-y-3 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{voice.name}</h3>
                      <p className="text-xs text-neutral-500 font-mono">{voice.modelId}</p>
                    </div>
                    {(voice.metadata?.isDefault as boolean) && (
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="default" className="text-xs">
                      {voice.type.toUpperCase()}
                    </Badge>
                    <Badge variant="info" className="text-xs">
                      {voice.language}
                    </Badge>
                    <Badge variant="info" className="text-xs">
                      {voice.gender}
                    </Badge>
                    <Badge variant="info" className="text-xs">
                      {voice.providerKey}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setPreviewVoice(voice)}
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultVoice(voice.id)}
                      disabled={isSettingDefault}
                      title={voice.metadata?.isDefault ? 'Already default' : 'Set as default'}
                    >
                      {voice.metadata?.isDefault ? (
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {previewVoice && (
        <Dialog open={!!previewVoice} onClose={() => setPreviewVoice(null)}>
          <DialogHeader title={`Preview: ${previewVoice.name}`} onClose={() => setPreviewVoice(null)} />
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-400">Provider</span>
                <p className="text-white font-medium">{previewVoice.providerKey}</p>
              </div>
              <div>
                <span className="text-neutral-400">Type</span>
                <p className="text-white font-medium">{previewVoice.type.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-neutral-400">Language</span>
                <p className="text-white font-medium">{previewVoice.language}</p>
              </div>
              <div>
                <span className="text-neutral-400">Gender</span>
                <p className="text-white font-medium">{previewVoice.gender}</p>
              </div>
              <div>
                <span className="text-neutral-400">Model ID</span>
                <p className="text-white font-mono text-xs">{previewVoice.modelId}</p>
              </div>
              <div>
                <span className="text-neutral-400">Active</span>
                <p className="text-white font-medium">{previewVoice.isActive ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Preview Text</label>
              <Input
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Enter text to preview..."
              />
              <Button
                onClick={() => previewAudio(previewVoice)}
                disabled={isPreviewingAudio}
                size="sm"
              >
                {isPreviewingAudio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Play Preview
              </Button>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewVoice(null)}>Close</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}