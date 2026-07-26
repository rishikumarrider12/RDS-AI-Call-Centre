'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button } from '@rds/ui'
import { Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { VoiceProvider } from '@rds/types'

interface FailoverStatusProps {
  providers: VoiceProvider[]
}

export default function FailoverStatus({ providers }: FailoverStatusProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['failover-status'],
    queryFn: () => api.getFailoverStatus(),
    refetchInterval: 30000,
  })

  const failoverMap = new Map(
    (data?.failover ?? []).map((f) => [f.key, f])
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-neutral-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading failover status...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-violet-400" />
          Failover Status
        </CardTitle>
        <CardDescription>Circuit breaker state and failover health for each provider.</CardDescription>
      </CardHeader>
      <CardContent>
        {providers.length === 0 ? (
          <div className="text-center text-neutral-500 py-8">No providers registered.</div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => {
              const failover = failoverMap.get(provider.key)
              const circuitOpen = failover?.circuitOpen ?? false
              const failureCount = failover?.failureCount ?? 0
              const priority = failover?.priority ?? 0
              const lastFailureAt = failover?.lastFailureAt ?? null

              return (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-900/30"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-sm font-medium text-white">{provider.name}</span>
                      <span className="ml-2 text-xs text-neutral-500">{provider.key}</span>
                    </div>
                    <Badge variant="default" className="text-xs">
                      P{priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs">
                      {circuitOpen ? (
                        <>
                          <XCircle className="h-3 w-3 text-red-400" />
                          <span className="text-red-400">Circuit Open</span>
                        </>
                      ) : failureCount > 0 ? (
                        <>
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                          <span className="text-amber-400">{failureCount} failures</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Healthy</span>
                        </>
                      )}
                    </div>
                    {lastFailureAt && (
                      <span className="text-xs text-neutral-500">
                        Last failure: {new Date(lastFailureAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Failover Status
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}