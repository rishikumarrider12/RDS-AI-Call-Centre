'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Input,
  Badge,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  ErrorState,
  TableSkeleton,
  useToast,
} from '@rds/ui'
import { KeyRound, Plus, Copy, Trash2, Loader2, Check, RefreshCw } from 'lucide-react'
import type { ApiKey } from '@rds/types'

function fmt(date: string | null) {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ApiKeysPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [generateOpen, setGenerateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScopes, setNewScopes] = useState('read,write')
  const [newExpiresAt, setNewExpiresAt] = useState('')
  const [revealed, setRevealed] = useState<{ name: string; key: string; scopes: string[]; expiresAt: string | null } | null>(null)
  const [copied, setCopied] = useState(false)
  const [rotateId, setRotateId] = useState<string | null>(null)
  const [rotateName, setRotateName] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => api.listApiKeysFlat(),
    enabled: !!user?.organization_id,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['apiKeys'] })

  const generateMutation = useMutation({
    mutationFn: () =>
      api.createApiKeyFlat({
        name: newName.trim() || 'Default key',
        scopes: newScopes.split(',').map((s) => s.trim()).filter(Boolean),
        expiresAt: newExpiresAt || null,
      }),
    onSuccess: (res) => {
      setGenerateOpen(false)
      setNewName('')
      setNewScopes('read,write')
      setNewExpiresAt('')
      setRevealed({ name: res.name, key: res.key, scopes: res.scopes, expiresAt: res.expiresAt })
      invalidate()
      toast('API key generated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to generate key', 'error'),
  })

  const rotateMutation = useMutation({
    mutationFn: () =>
      api.rotateApiKeyFlat(rotateId!, {
        name: rotateName.trim() || undefined,
      }),
    onSuccess: (res) => {
      setRotateId(null)
      setRotateName('')
      setRevealed({ name: res.name, key: res.key, scopes: res.scopes, expiresAt: res.expiresAt })
      invalidate()
      toast('API key rotated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to rotate key', 'error'),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.deleteApiKeyFlat(id),
    onSuccess: () => {
      invalidate()
      toast('API key revoked', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to revoke key', 'error'),
  })

  const copy = async () => {
    if (!revealed) return
    try {
      await navigator.clipboard.writeText(revealed.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy to clipboard', 'error')
    }
  }

  const keys = data?.keys ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-violet-400" /> API Keys
          </h1>
          <p className="text-sm text-neutral-450 mt-1">Create, rotate and revoke programmatic access credentials.</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4" /> Generate Key
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <TableSkeleton rows={4} cols={7} />
          ) : isError ? (
            <ErrorState message={(error as any)?.message || 'Failed to load API keys'} onRetry={() => refetch()} />
          ) : keys.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="h-7 w-7" />}
              title="No API keys yet"
              description="Generate a key to enable secure programmatic access to the API."
              action={
                <Button onClick={() => setGenerateOpen(true)}>
                  <Plus className="h-4 w-4" /> Generate Key
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k: ApiKey) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium text-white">{k.name}</TableCell>
                    <TableCell className="font-mono text-neutral-400">{k.keyPrefix}••••••••</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(k.scopes ?? []).map((s) => (
                          <Badge key={s} variant="info" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.status === 'active' ? 'success' : 'danger'} className="capitalize">
                        {k.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">{fmt(k.expiresAt)}</TableCell>
                    <TableCell className="text-neutral-400">{fmt(k.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Rotate"
                          onClick={() => {
                            setRotateId(k.id)
                            setRotateName(k.name)
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-violet-400 hover:bg-neutral-850 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Revoke"
                          onClick={() => {
                            if (confirm(`Revoke key "${k.name}"? This cannot be undone.`))
                              revokeMutation.mutate(k.id)
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {generateOpen && (
        <Dialog open onClose={() => setGenerateOpen(false)}>
          <DialogHeader title="Generate API Key" onClose={() => setGenerateOpen(false)} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Key Name</span>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Production server" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Scopes (comma separated)</span>
              <Input value={newScopes} onChange={(e) => setNewScopes(e.target.value)} placeholder="read,write" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Expires At (optional)</span>
              <Input type="date" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} />
            </label>
            <p className="text-[11px] text-neutral-500">
              The full key is shown only once after creation. Store it securely.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Generate
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {rotateId && (
        <Dialog open onClose={() => setRotateId(null)}>
          <DialogHeader title="Rotate API Key" onClose={() => setRotateId(null)} />
          <DialogBody className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-neutral-400">New Key Name (optional)</span>
              <Input value={rotateName} onChange={(e) => setRotateName(e.target.value)} placeholder={rotateName || 'Keep current name'} />
            </label>
            <p className="text-[11px] text-neutral-500">
              Rotating invalidates the current key immediately and returns a new plaintext key once.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRotateId(null)}>Cancel</Button>
            <Button onClick={() => rotateMutation.mutate()} disabled={rotateMutation.isPending}>
              {rotateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Rotate
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {revealed && (
        <Dialog open onClose={() => setRevealed(null)}>
          <DialogHeader title="API Key Created" onClose={() => setRevealed(null)} />
          <DialogBody className="space-y-4">
            <p className="text-sm text-neutral-400">
              Copy this key now. For security, it will not be shown again.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <code className="flex-1 break-all text-xs text-violet-300">{revealed.key}</code>
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            {revealed.scopes?.length ? (
              <div className="flex flex-wrap gap-1">
                {revealed.scopes.map((s) => (
                  <Badge key={s} variant="info" className="text-[10px]">{s}</Badge>
                ))}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setRevealed(null)}>Done</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
