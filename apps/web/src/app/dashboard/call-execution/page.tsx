'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, Input, useToast } from '@rds/ui'
import { Phone, PhoneOff, Play, StopCircle, Loader2, Mic, Volume2, PhoneCall, Clock, Hash } from 'lucide-react'

type TtsProvider = { key: string; name: string; category: string; isActive: boolean }
type SttProvider = { key: string; name: string; category: string; isActive: boolean }
type VoiceOption = { id: string; modelId: string; name: string; type: string; language: string; gender: string }

export default function CallExecutionPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [toNumber, setToNumber] = useState('')
  const [fromNumber, setFromNumber] = useState('')
  const [callerId, setCallerId] = useState('')
  const [ttsText, setTtsText] = useState('Hello, this is an automated call from RDS Call Centre.')
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null)
  const [callStatus, setCallStatus] = useState<string>('idle')

  const providersQuery = useQuery({
    queryKey: ['registered-providers'],
    queryFn: () => api.getAllRegisteredProviders(),
  })

  const ttsProviders = (providersQuery.data?.providers ?? []).filter((p) => p.category === 'tts' || p.category === 'both')
  const sttProviders = (providersQuery.data?.providers ?? []).filter((p) => p.category === 'stt' || p.category === 'both')

  const startCallMutation = useMutation({
    mutationFn: (input: { to: string; from: string; callerId?: string; ttsText: string; voiceId?: string }) =>
      api.initiateCall(input),
    onSuccess: (data) => {
      setActiveCallSid(data.callSid)
      setCallStatus('ringing')
      toast('Call started. SID: ' + data.callSid, 'success')
      queryClient.invalidateQueries({ queryKey: ['active-calls'] })
    },
    onError: (err) => {
      toast('Failed to start call: ' + (err as Error).message, 'error')
    },
  })

  const answerCallMutation = useMutation({
    mutationFn: (callSid: string) => api.answerCall(callSid),
    onSuccess: () => {
      setCallStatus('in-progress')
      toast('Call answered', 'info')
    },
    onError: (err) => {
      toast('Failed to answer call: ' + (err as Error).message, 'error')
    },
  })

  const endCallMutation = useMutation({
    mutationFn: (callSid: string) => api.terminateCall(callSid),
    onSuccess: () => {
      setActiveCallSid(null)
      setCallStatus('idle')
      toast('Call ended', 'info')
      queryClient.invalidateQueries({ queryKey: ['active-calls'] })
    },
    onError: (err) => {
      toast('Failed to end call: ' + (err as Error).message, 'error')
    },
  })

  const playAudioMutation = useMutation({
    mutationFn: ({ callSid, text, voiceId }: { callSid: string; text: string; voiceId?: string }) =>
      api.playCallAudio(callSid, text, voiceId),
    onSuccess: () => {
      toast('Playing audio', 'info')
    },
    onError: (err) => {
      toast('Failed to play audio: ' + (err as Error).message, 'error')
    },
  })

  const startRecordingMutation = useMutation({
    mutationFn: (callSid: string) => api.startCallRecording(callSid),
    onSuccess: () => {
      toast('Recording started', 'info')
    },
    onError: (err) => {
      toast('Failed to start recording: ' + (err as Error).message, 'error')
    },
  })

  const stopRecordingMutation = useMutation({
    mutationFn: (callSid: string) => api.stopCallRecording(callSid),
    onSuccess: () => {
      toast('Recording stopped', 'info')
    },
    onError: (err) => {
      toast('Failed to stop recording: ' + (err as Error).message, 'error')
    },
  })

  const getStatusMutation = useMutation({
    mutationFn: (callSid: string) => api.getCallStatus(callSid),
    onSuccess: (data) => {
      setCallStatus(data.status)
    },
  })

  const executeFlowMutation = useMutation({
    mutationFn: (input: { callSid: string; to: string; from: string; ttsText: string; voiceId?: string }) =>
      api.executeCallFlow(input),
    onSuccess: (data) => {
      setCallStatus(data.status)
      toast('Call flow executed. Status: ' + data.status, 'success')
    },
    onError: (err) => {
      toast('Call flow failed: ' + (err as Error).message, 'error')
    },
  })

  const handleStartCall = () => {
    if (!toNumber || !fromNumber) {
      toast('Missing fields: To and From numbers are required', 'error')
      return
    }
    startCallMutation.mutate({
      to: toNumber,
      from: fromNumber,
      callerId: callerId || undefined,
      ttsText,
      voiceId: selectedVoiceId || undefined,
    })
  }

  const handleAnswer = () => {
    if (!activeCallSid) return
    answerCallMutation.mutate(activeCallSid)
  }

  const handleEnd = () => {
    if (!activeCallSid) return
    endCallMutation.mutate(activeCallSid)
  }

  const handlePlayAudio = () => {
    if (!activeCallSid) return
    playAudioMutation.mutate({ callSid: activeCallSid, text: ttsText, voiceId: selectedVoiceId || undefined })
  }

  const handleStartRecording = () => {
    if (!activeCallSid) return
    startRecordingMutation.mutate(activeCallSid)
  }

  const handleStopRecording = () => {
    if (!activeCallSid) return
    stopRecordingMutation.mutate(activeCallSid)
  }

  const handleCheckStatus = () => {
    if (!activeCallSid) return
    getStatusMutation.mutate(activeCallSid)
  }

  const handleExecuteFlow = () => {
    if (!activeCallSid || !toNumber || !fromNumber) return
    executeFlowMutation.mutate({
      callSid: activeCallSid,
      to: toNumber,
      from: fromNumber,
      ttsText,
      voiceId: selectedVoiceId || undefined,
    })
  }

  const isCallActive = callStatus === 'ringing' || callStatus === 'in-progress'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PhoneCall className="h-8 w-8 text-violet-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Call Execution</h1>
          <p className="text-sm text-neutral-500">Initiate and manage AI-powered phone calls</p>
        </div>
      </div>

      {/* Call Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Call Controls</CardTitle>
          <CardDescription>Start, answer, end, and control AI phone calls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">To Number</label>
              <Input
                placeholder="+1234567890"
                value={toNumber}
                onChange={(e) => setToNumber(e.target.value)}
                disabled={isCallActive}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">From Number</label>
              <Input
                placeholder="+1987654321"
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                disabled={isCallActive}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">Caller ID</label>
              <Input
                placeholder="+11234567890"
                value={callerId}
                onChange={(e) => setCallerId(e.target.value)}
                disabled={isCallActive}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">TTS Text</label>
            <Input
              placeholder="Enter text to speak during the call..."
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              disabled={isCallActive}
            />
          </div>

          {/* TTS Provider selector */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-neutral-400 mb-1 block">TTS Provider</label>
              <select
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
                value={ttsProviders[0]?.key ?? ''}
                disabled
              >
                <option value={ttsProviders[0]?.key ?? ''}>
                  {ttsProviders[0]?.name ?? 'No TTS provider'}
                </option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-neutral-400 mb-1 block">STT Provider</label>
              <select
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
                value={sttProviders[0]?.key ?? ''}
                disabled
              >
                <option value={sttProviders[0]?.key ?? ''}>
                  {sttProviders[0]?.name ?? 'No STT provider'}
                </option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-neutral-400 mb-1 block">Voice</label>
              <Input placeholder="Voice ID (optional)" value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)} disabled={isCallActive} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isCallActive ? (
              <Button
                onClick={handleStartCall}
                loading={startCallMutation.isPending}
                disabled={startCallMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Phone className="mr-2 h-4 w-4" />
                Start Call
              </Button>
            ) : (
              <>
                {callStatus === 'ringing' && (
                  <Button onClick={handleAnswer} loading={answerCallMutation.isPending} disabled={answerCallMutation.isPending}>
                    <Phone className="mr-2 h-4 w-4" />
                    Answer
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handlePlayAudio}
                  loading={playAudioMutation.isPending}
                  disabled={playAudioMutation.isPending}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  Play Audio
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStartRecording}
                  loading={startRecordingMutation.isPending}
                  disabled={startRecordingMutation.isPending}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStopRecording}
                  loading={stopRecordingMutation.isPending}
                  disabled={stopRecordingMutation.isPending}
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCheckStatus}
                  loading={getStatusMutation.isPending}
                  disabled={getStatusMutation.isPending}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Check Status
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExecuteFlow}
                  loading={executeFlowMutation.isPending}
                  disabled={executeFlowMutation.isPending}
                >
                  <Hash className="mr-2 h-4 w-4" />
                  Execute Flow
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleEnd}
                  loading={endCallMutation.isPending}
                  disabled={endCallMutation.isPending}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Call
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Call Status */}
      {activeCallSid && (
        <Card>
          <CardHeader>
            <CardTitle>Active Call</CardTitle>
            <CardDescription className="font-mono">{activeCallSid}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={callStatus === 'in-progress' ? 'success' : callStatus === 'ringing' ? 'warning' : 'default'}>
                  {callStatus}
                </Badge>
              </div>
              <div className="text-neutral-400">
                {callStatus === 'idle' && 'Waiting for call to start...'}
                {callStatus === 'ringing' && 'Call is ringing...'}
                {callStatus === 'in-progress' && 'Call is in progress'}
                {callStatus === 'completed' && 'Call completed'}
                {callStatus === 'failed' && 'Call failed'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Providers</CardTitle>
          <CardDescription>TTS and STT providers available for call execution</CardDescription>
        </CardHeader>
        <CardContent>
          {providersQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
          ) : providersQuery.isError ? (
            <div className="text-neutral-400 text-sm py-4">Failed to load providers</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left py-2 px-3 text-neutral-400 font-medium">Provider</th>
                    <th className="text-left py-2 px-3 text-neutral-400 font-medium">Category</th>
                    <th className="text-left py-2 px-3 text-neutral-400 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-neutral-400 font-medium">Capabilities</th>
                  </tr>
                </thead>
                <tbody>
                  {(providersQuery.data?.providers ?? []).map((p) => (
                    <tr key={p.key} className="border-b border-neutral-800/50">
                      <td className="py-2 px-3 text-white font-medium">{p.name}</td>
                      <td className="py-2 px-3 text-neutral-400 capitalize">{p.category}</td>
                      <td className="py-2 px-3">
                        <Badge variant={p.isActive ? 'success' : 'danger'}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-neutral-500">
                        {Object.entries(p.capabilities ?? {})
                          .filter(([, v]) => v === true)
                          .map(([k]) => k)
                          .join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}