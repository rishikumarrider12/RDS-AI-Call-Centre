'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
  Mic,
  Volume2,
  Settings2,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Play,
} from 'lucide-react'
import type { VoiceProvider, VoiceModel } from '@rds/types'

export default function ProviderSelectionPage() {
  const { toast } = useToast()

  const [ttsProvider, setTtsProvider] = useState<VoiceProvider | null>(null)
  const [sttProvider, setSttProvider] = useState<VoiceProvider | null>(null)
  const [selectedTtsVoice, setSelectedTtsVoice] = useState<VoiceModel | null>(null)
  const [previewLanguage, setPreviewLanguage] = useState('en')
  const [previewProviderKey, setPreviewProviderKey] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)

  const ttsQuery = useQuery({
    queryKey: ['selection-tts'],
    queryFn: () => api.getSelectionTtsProvider(),
  })

  const sttQuery = useQuery({
    queryKey: ['selection-stt'],
    queryFn: () => api.getSelectionSttProvider(),
  })

  const providersQuery = useQuery({
    queryKey: ['selection-providers'],
    queryFn: () => api.getAllRegisteredProviders(),
  })

  const voicesQuery = useQuery({
    queryKey: ['selection-voices', previewProviderKey, previewLanguage],
    queryFn: () => {
      if (!previewProviderKey) return { voices: [] as VoiceModel[] }
      return api.getAvailableVoices(previewProviderKey, previewLanguage)
    },
    enabled: !!previewProviderKey,
  })

  const languagesQuery = useQuery({
    queryKey: ['selection-languages', previewProviderKey],
    queryFn: () => {
      if (!previewProviderKey) return { languages: [] as Array<{ code: string; name: string }> }
      return api.getSupportedLanguages(previewProviderKey)
    },
    enabled: !!previewProviderKey,
  })

  useEffect(() => {
    if (ttsQuery.data?.provider) setTtsProvider(ttsQuery.data.provider)
    if (sttQuery.data?.provider) setSttProvider(sttQuery.data.provider)
  }, [ttsQuery.data, sttQuery.data])

  const isLoading = ttsQuery.isLoading || sttQuery.isLoading || providersQuery.isLoading
  const isError = ttsQuery.isError || sttQuery.isError || providersQuery.isError

  if (isLoading) {
    return <LoadingState label="Loading provider selection…" />
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load provider selection data"
        onRetry={() => {
          ttsQuery.refetch()
          sttQuery.refetch()
          providersQuery.refetch()
        }}
      />
    )
  }

  const allProviders = providersQuery.data?.providers ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-violet-400" /> Provider Selection
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Recommended providers for TTS, STT, voice preview, and capability comparison.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { ttsQuery.refetch(); sttQuery.refetch(); providersQuery.refetch() }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-violet-400" /> TTS Provider
            </CardTitle>
            <CardDescription>Recommended text-to-speech provider for your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            {ttsProvider ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{ttsProvider.name}</p>
                    <p className="text-xs text-neutral-500 capitalize">{ttsProvider.category}</p>
                  </div>
                  <Badge variant="success">Recommended</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast('TTS provider test started', 'info')}>
                    <Play className="h-4 w-4 mr-2" /> Test
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState icon={<Volume2 className="h-7 w-7" />} title="No TTS provider" description="No TTS provider is currently available." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-sky-400" /> STT Provider
            </CardTitle>
            <CardDescription>Recommended speech-to-text provider for your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            {sttProvider ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{sttProvider.name}</p>
                    <p className="text-xs text-neutral-500 capitalize">{sttProvider.category}</p>
                  </div>
                  <Badge variant="success">Recommended</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast('STT provider test started', 'info')}>
                    <Play className="h-4 w-4 mr-2" /> Test
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState icon={<Mic className="h-7 w-7" />} title="No STT provider" description="No STT provider is currently available." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voice Preview</CardTitle>
          <CardDescription>Preview available voices with provider and language filter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Provider</label>
              <select
                value={previewProviderKey}
                onChange={(e) => { setPreviewProviderKey(e.target.value); setSelectedTtsVoice(null) }}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                <option value="">Select provider</option>
                {allProviders.map((p) => (
                  <option key={p.key} value={p.key}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-neutral-300">Language</label>
              <select
                value={previewLanguage}
                onChange={(e) => setPreviewLanguage(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                {(languagesQuery.data?.languages ?? []).map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>

          {voicesQuery.isLoading && <LoadingState label="Loading voices…" />}
          {voicesQuery.isError && <ErrorState message="Failed to load voices" onRetry={() => voicesQuery.refetch()} />}

          {!voicesQuery.isLoading && !voicesQuery.isError && voicesQuery.data && voicesQuery.data.voices.length === 0 && (
            <EmptyState icon={<Headphones className="h-7 w-7" />} title="No voices found" description="No voices available for the selected provider and language." />
          )}

          {voicesQuery.data && voicesQuery.data.voices.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voicesQuery.data.voices.map((voice) => (
                  <TableRow key={voice.id}>
                    <TableCell className="text-white font-medium">{voice.name}</TableCell>
                    <TableCell className="text-neutral-400">{voice.modelId}</TableCell>
                    <TableCell>{voice.language}</TableCell>
                    <TableCell className="capitalize">{voice.gender ?? 'neutral'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTtsVoice(voice)
                          setIsPreviewing(true)
                        }}
                        disabled={isPreviewing}
                      >
                        {isPreviewing && selectedTtsVoice?.id === voice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Capabilities</CardTitle>
          <CardDescription>Feature comparison across all registered providers.</CardDescription>
        </CardHeader>
        <CardContent>
          {allProviders.length === 0 ? (
            <EmptyState icon={<Activity className="h-7 w-7" />} title="No providers registered" description="No voice providers are currently registered." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>TTS</TableHead>
                  <TableHead>STT</TableHead>
                  <TableHead>Streaming</TableHead>
                  <TableHead>Voice Listing</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProviders.map((p) => {
                  const caps = p.capabilities ?? {}
                  return (
                    <TableRow key={p.key}>
                      <TableCell className="text-white font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="default" className={p.category === 'both' ? 'bg-emerald-500/20 text-emerald-400' : p.category === 'tts' ? 'bg-violet-500/20 text-violet-400' : 'bg-sky-500/20 text-sky-400'}>
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{caps.tts ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-neutral-600" />}</TableCell>
                      <TableCell>{caps.stt ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-neutral-600" />}</TableCell>
                      <TableCell>{caps.streaming ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-neutral-600" />}</TableCell>
                      <TableCell>{caps.voiceListing ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-neutral-600" />}</TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isPreviewing && selectedTtsVoice && (
        <Dialog open={isPreviewing} onClose={() => setIsPreviewing(false)}>
          <DialogHeader title={`Preview: ${selectedTtsVoice.name}`} onClose={() => setIsPreviewing(false)} />
          <DialogBody className="space-y-4">
            <p className="text-sm text-neutral-400">Voice preview for <span className="font-semibold text-white">{selectedTtsVoice.name}</span> ({selectedTtsVoice.language})</p>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-neutral-800 bg-neutral-900/30">
              <Activity className="h-6 w-6 text-violet-400 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-white">Playing preview…</p>
                <p className="text-xs text-neutral-500">Provider: {previewProviderKey} | Voice ID: {selectedTtsVoice.modelId}</p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewing(false)}>Close</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}