'use client'

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
  ErrorState,
  LoadingState,
  useToast,
} from '@rds/ui'
import { Activity, RefreshCw, CheckCircle } from 'lucide-react'
import FailoverStatus from '@/components/voice-providers/FailoverStatus'
import type { VoiceProvider } from '@rds/types'

export default function ProviderHealthPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const healthQuery = useQuery({
    queryKey: ['provider-health'],
    queryFn: () => api.checkAllProviderHealth(),
    refetchInterval: 60000,
  })

  const providersQuery = useQuery({
    queryKey: ['voice-providers'],
    queryFn: () => api.listVoiceProviders(),
  })

  const providers = providersQuery.data?.providers || []
  const health = healthQuery.data?.health ?? {}

  const checkMutation = useMutation({
    mutationFn: (providerKey: string) => api.checkProviderHealth(providerKey),
    onSuccess: () => {
      toast('Health check completed', 'success')
      queryClient.invalidateQueries({ queryKey: ['provider-health'] })
    },
    onError: (err: any) => toast(err.message || 'Health check failed', 'error'),
  })

  const isLoading = healthQuery.isLoading || providersQuery.isLoading
  const isError = healthQuery.isError

  if (isLoading) {
    return <LoadingState label="Loading provider health..." />
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load provider health"
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['provider-health'] })}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-violet-400" /> Provider Health
          </h1>
          <p className="text-sm text-neutral-450 mt-1">
            Monitor the health and connectivity of all registered voice providers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['provider-health'] })}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              providers.forEach((p: VoiceProvider) => checkMutation.mutate(p.key))
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Check All
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Status</CardTitle>
          <CardDescription>Real-time health status for each registered voice provider.</CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">No providers registered.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider: VoiceProvider) => {
                  const providerHealth = health[provider.key] ?? { status: 'unknown', latencyMs: null, details: {} }
                  const statusVariant = providerHealth.status === 'healthy' ? 'success' : providerHealth.status === 'degraded' ? 'warning' : 'danger'
                  return (
                    <TableRow key={provider.id}>
                      <TableCell className="text-white font-medium">{provider.name}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {provider.category === 'both' ? 'TTS/STT' : provider.category.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>
                          {providerHealth.status === 'healthy' ? (
                            <CheckCircle className="h-4 w-4 mr-1 inline" />
                          ) : (
                            <Activity className="h-4 w-4 mr-1 inline" />
                          )}
                          {providerHealth.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-neutral-400">
                        {providerHealth.latencyMs != null ? providerHealth.latencyMs + 'ms' : '--'}
                      </TableCell>
                      <TableCell className="text-neutral-500 text-xs">
                        {providerHealth.details?.reason || (providerHealth.details?.provider ?? '')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => checkMutation.mutate(provider.key)} disabled={checkMutation.isPending}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FailoverStatus providers={providers} />
    </div>
  )
}