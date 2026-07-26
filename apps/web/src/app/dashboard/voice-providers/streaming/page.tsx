'use client'

import { useState, useEffect } from 'react'
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast,
} from '@rds/ui'
import { Headphones, Mic, Play, RefreshCw, Loader2 } from 'lucide-react'
import StreamingAudioPlayer from '@/components/voice-providers/StreamingAudioPlayer'
import LiveTranscriptionViewer from '@/components/voice-providers/LiveTranscriptionViewer'
import FailoverStatus from '@/components/voice-providers/FailoverStatus'
import type { VoiceProvider } from '@rds/types'

export default function VoiceProvidersStreamingPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const providersQuery = useQuery({
    queryKey: ['voice-providers'],
    queryFn: () => api.listVoiceProviders(),
  })

  const providers = providersQuery.data?.providers ?? []

  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('')
  const [testText, setTestText] = useState('Hello, this is a test of the streaming audio feature.')

  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0].key)
    }
  }, [providers, selectedProvider])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
          <Headphones className="h-6 w-6 text-violet-400" /> Voice Provider Streaming
        </h1>
        <p className="text-sm text-neutral-450 mt-1">
          Test real-time audio streaming, transcription, and provider failover.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Provider Selection</CardTitle>
              <CardDescription>Choose a provider and voice for streaming tests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-neutral-300">Provider</label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => {
                      setSelectedProvider(e.target.value)
                      setSelectedVoiceId('')
                    }}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
                  >
                    {providers.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-neutral-300">Voice ID</label>
                  <input
                    type="text"
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    placeholder="e.g. en-US-Wavenet-A"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-violet-400" />
                Streaming Audio
              </CardTitle>
              <CardDescription>Synthesize and stream audio in real time.</CardDescription>
            </CardHeader>
            <CardContent>
              <StreamingAudioPlayer
                onStreamRequest={async (text: string, voiceId: string) => {
                  if (!selectedProvider) throw new Error('No provider selected')
                  return api.streamAudio(selectedProvider, text, voiceId)
                }}
                disabled={providersQuery.isLoading || !selectedProvider}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-violet-400" />
                Live Transcription
              </CardTitle>
              <CardDescription>Record audio and get real-time transcription results.</CardDescription>
            </CardHeader>
            <CardContent>
              <LiveTranscriptionViewer
                onStreamRequest={async (audioBlob: Blob, language?: string) => {
                  if (!selectedProvider) throw new Error('No provider selected')
                  return api.streamTranscription(selectedProvider, audioBlob, language)
                }}
                disabled={providersQuery.isLoading || !selectedProvider}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <FailoverStatus providers={providers} />

          <Card>
            <CardHeader>
              <CardTitle>Quick Test</CardTitle>
              <CardDescription>Run a quick streaming test on the selected provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter test text..."
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-violet-500 focus:outline-none"
                rows={3}
              />
              <Button
                className="w-full"
                size="sm"
                onClick={async () => {
                  if (!selectedProvider || !testText.trim()) return
                  try {
                    const stream = await api.streamAudio(selectedProvider, testText, selectedVoiceId || 'default')
                    const reader = stream.getReader()
                    while (true) {
                      const { done } = await reader.read()
                      if (done) break
                    }
                    toast('Audio stream completed', 'success')
                  } catch (err: any) {
                    toast(err.message || 'Streaming test failed', 'error')
                  }
                }}
                disabled={!selectedProvider || providersQuery.isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Test Stream
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}