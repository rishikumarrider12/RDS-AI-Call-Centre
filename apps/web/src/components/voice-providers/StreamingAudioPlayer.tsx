'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@rds/ui'
import { Play, Pause, Square, Volume2, Loader2 } from 'lucide-react'

interface StreamingAudioPlayerProps {
  onStreamRequest: (text: string, voiceId: string) => Promise<ReadableStream<Uint8Array>>
  disabled?: boolean
}

export default function StreamingAudioPlayer({ onStreamRequest, disabled }: StreamingAudioPlayerProps) {
  const [text, setText] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement>(null)

  const stopPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.src = ''
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    sourceNodeRef.current = null
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [stopPlayback])

  async function handlePlay() {
    if (!text.trim() || !voiceId.trim()) return
    setIsLoading(true)
    setIsPlaying(true)
    try {
      const stream = await onStreamRequest(text, voiceId)
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

      if (audioElementRef.current) {
        audioElementRef.current.src = url
        audioElementRef.current.play()
        audioElementRef.current.onended = () => {
          setIsPlaying(false)
          URL.revokeObjectURL(url)
        }
      }
    } catch (err) {
      setIsLoading(false)
      setIsPlaying(false)
    }
  }

  return (
    <div className="space-y-4">
      <audio ref={audioElementRef} className="hidden" />
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Text to synthesize</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to synthesize to audio..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-violet-500 focus:outline-none"
          rows={3}
          disabled={disabled || isPlaying}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Voice ID</label>
        <input
          type="text"
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          placeholder="e.g. en-US-Wavenet-A"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-violet-500 focus:outline-none"
          disabled={disabled || isPlaying}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={handlePlay}
          disabled={disabled || isLoading || !text.trim() || !voiceId.trim()}
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isLoading ? 'Streaming...' : isPlaying ? 'Stop' : 'Stream Audio'}
        </Button>
        {(isPlaying || isLoading) && (
          <Button variant="outline" size="sm" onClick={stopPlayback}>
            <Square className="h-4 w-4" />
            Stop
          </Button>
        )}
      </div>
    </div>
  )
}