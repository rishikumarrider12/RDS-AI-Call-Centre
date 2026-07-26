'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@rds/ui'
import { Mic, Square, Loader2 } from 'lucide-react'

interface LiveTranscriptionViewerProps {
  onStreamRequest: (audioBlob: Blob, language?: string) => Promise<{ text: string; confidence: number }>
  disabled?: boolean
}

export default function LiveTranscriptionViewer({ onStreamRequest, disabled }: LiveTranscriptionViewerProps) {
  const [language, setLanguage] = useState('en')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setIsProcessing(true)
        try {
          const result = await onStreamRequest(blob, language)
          setTranscript(result.text)
          setConfidence(result.confidence)
        } catch (err) {
          setTranscript('Transcription failed')
        } finally {
          setIsProcessing(false)
        }
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start(100)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      setTranscript('Microphone access denied')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-violet-500 focus:outline-none"
          disabled={disabled}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="zh">Chinese</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          variant={isRecording ? 'destructive' : 'default'}
          size="sm"
          disabled={disabled || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {isProcessing ? 'Processing...' : isRecording ? 'Stop' : 'Start Recording'}
        </Button>
      </div>
      {(transcript || confidence !== null) && (
        <div className="space-y-2 p-4 rounded-lg border border-neutral-800 bg-neutral-900/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Transcript</span>
            {confidence !== null && (
              <span className="text-xs text-neutral-400">Confidence: {(confidence * 100).toFixed(1)}%</span>
            )}
          </div>
          <p className="text-sm text-neutral-300 whitespace-pre-wrap">{transcript || 'Waiting for audio...'}</p>
        </div>
      )}
    </div>
  )
}