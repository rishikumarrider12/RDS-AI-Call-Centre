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
import { KeyRound, Plus, Copy, Trash2, Loader2, Check } from 'lucide-react'
import type { ApiKey } from '@rds/types'

function fmt(date: string | null) {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ApiKeysPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const orgId = user?.organization_id || ''

  const [generateOpen, setGenerateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [revealed, setRevealed] = useState<{ name: string; key: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['apiKeys', orgId],
    queryFn: () => api.listApiKeys(orgId),
    enabled: !!orgId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['apiKeys', orgId] })

  const generateMutation = useMutation({
    mutationFn: (name: string) => api.createApiKey(orgId, name),
    onSuccess: (res) => {
      setGenerateOpen(false)
      setRevealed({ name: res.name, key: res.key })
      invalidate()
      toast('API key generated', 'success')
    },
    onError: (err: any) => toast(err.message || 'Failed to generate key', 'error'),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.revokeApiKey(orgId, id),
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">API Keys</h1>
          <p className="text-sm text-neutral-450 mt-1">Generate and manage programmatic access keys.</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4" /> Generate Key
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <TableSkeleton rows={4} cols={6} />
          ) : isError ? (
            <ErrorState message={(error as any)?.message || 'Failed to load API keys'} onRetry={() => refetch()} />
          ) : (data?.keys.length ?? 0) === 0 ? (
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
                  <TableHead>Key</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.keys.map((k: ApiKey) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium text-white">{k.name}</TableCell>
                    <TableCell className="font-mono text-neutral-400">{k.keyPrefix}••••••••</TableCell>
                    <TableCell>
                      <Badge variant="info">{k.permissions}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.status === 'active' ? 'success' : 'danger'} className="capitalize">
                        {k.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">{fmt(k.createdAt)}</TableCell>
                    <TableCell className="text-neutral-400">{fmt(k.lastUsedAt)}</TableCell>
                    <TableCell className="text-right">
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
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Production server"
              />
            </label>
            <p className="text-[11px] text-neutral-500">
              The full key is shown only once after creation. Store it securely.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generateMutation.mutate(newName.trim() || 'Default key')}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}{' '}
              Generate
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
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setRevealed(null)}>Done</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}


