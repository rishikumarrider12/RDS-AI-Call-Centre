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
  Input,
} from '@rds/ui'
import { Settings2, RefreshCw, Loader2, Trash2, CheckCircle, ShieldCheck } from 'lucide-react'
import type { ProviderCredential } from '@rds/types'

export default function ProviderSettingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingCredential, setDeletingCredential] = useState<ProviderCredential | null>(null)
  const [credentialKey, setCredentialKey] = useState('')
  const [credentialValue, setCredentialValue] = useState('')

  const credentialsQuery = useQuery({
    queryKey: ['provider-credentials'],
    queryFn: () => api.listProviderCredentials(),
    refetchInterval: 30000,
  })

  const credentials = useMemo(() => credentialsQuery.data?.credentials || [], [credentialsQuery.data])

  const saveMutation = useMutation({
    mutationFn: (input: { providerKey: string; credentials: Record<string, unknown> }) =>
      api.saveProviderCredential(input),
    onSuccess: () => {
      toast('Credential saved', 'success')
      setCredentialKey('')
      setCredentialValue('')
      queryClient.invalidateQueries({ queryKey: ['provider-credentials'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to save credential', 'error'),
  })

  const verifyMutation = useMutation({
    mutationFn: (providerKey: string) => api.verifyProviderCredential(providerKey),
    onSuccess: () => {
      toast('Credential verified', 'success')
      queryClient.invalidateQueries({ queryKey: ['provider-credentials'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to verify credential', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (providerKey: string) => api.deleteProviderCredential(providerKey),
    onSuccess: () => {
      toast('Credential deleted', 'success')
      setDeleteOpen(false)
      setDeletingCredential(null)
      queryClient.invalidateQueries({ queryKey: ['provider-credentials'] })
    },
    onError: (err: any) => toast(err.message || 'Failed to delete credential', 'error'),
  })

  const isLoading = credentialsQuery.isLoading
  const isError = credentialsQuery.isError

  if (isLoading) {
    return <LoadingState label="Loading provider settings…" />
  }

  if (isError) {
    return (
      <ErrorState message="Failed to load provider settings" onRetry={() => queryClient.invalidateQueries({ queryKey: ['provider-credentials'] })} />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-violet-400" /> Provider Settings
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Manage API credentials for voice providers.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['provider-credentials'] })}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>Add or update API credentials for voice providers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">Provider Key</label>
                <Input value={credentialKey} onChange={(e) => setCredentialKey(e.target.value)} placeholder="e.g. elevenlabs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">Credential Value</label>
                <Input
                  type="password"
                  value={credentialValue}
                  onChange={(e) => setCredentialValue(e.target.value)}
                  placeholder="API key or secret"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!credentialKey || !credentialValue) return
                saveMutation.mutate({ providerKey: credentialKey, credentials: { apiKey: credentialValue } })
                setCredentialKey('')
                setCredentialValue('')
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Credential'}
            </Button>
          </div>

          {credentials.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-7 w-7" />}
              title="No credentials configured"
              description="Add credentials for a voice provider to enable TTS/STT."
            />
          ) : (
            <Table className="mt-6">
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell className="text-white font-medium">{cred.providerKey}</TableCell>
                    <TableCell>
                      <Badge variant={cred.isActive ? 'success' : 'default'}>
                        {cred.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">
                      {cred.lastVerifiedAt ? new Date(cred.lastVerifiedAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => verifyMutation.mutate(cred.providerKey)} title="Verify">
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeletingCredential(cred); setDeleteOpen(true); }} title="Delete">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeletingCredential(null); }}>
        <DialogHeader title="Delete Credential" onClose={() => { setDeleteOpen(false); setDeletingCredential(null); }} />
        <DialogBody>
          <p className="text-sm text-neutral-300">
            Are you sure you want to delete the credential for{' '}
            <span className="font-semibold text-white">{deletingCredential?.providerKey}</span>?
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeletingCredential(null); }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deletingCredential && deleteMutation.mutate(deletingCredential.providerKey)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}