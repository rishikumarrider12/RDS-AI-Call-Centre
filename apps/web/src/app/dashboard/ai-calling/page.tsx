"use client"

import { useState } from "react"
import { useSession } from "@/hooks/useSession"
import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, Input, Tabs, TabsList, TabsTrigger, TabsContent, useToast } from "@rds/ui"
import { Brain, Sparkles, TrendingUp, CheckCircle, Zap, Target, Lightbulb } from "lucide-react"
import type { AICallSummary, AgentAssistSuggestion, CallSentiment, CallIntent, AICallMetrics } from "@rds/types"

export default function AICallingPage() {
  const { toast } = useToast()
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("summary")

const { user } = useSession()
  const organizationId = user?.organization_id ?? ""

  const summaryQuery = useQuery({
    queryKey: ["ai-summary", activeCallId],
    queryFn: () => {
      if (!activeCallId || !organizationId) return null
      return api.getAISummary(organizationId, activeCallId)
    },
    enabled: !!activeCallId && !!organizationId,
  })

  const sentimentQuery = useQuery({
    queryKey: ["ai-sentiment", activeCallId],
    queryFn: () => {
      if (!activeCallId || !organizationId) return null
      return api.getAISentiment(organizationId, activeCallId)
    },
    enabled: !!activeCallId && !!organizationId,
  })

  const suggestionsQuery = useQuery({
    queryKey: ["ai-suggestions", activeCallId],
    queryFn: () => {
      if (!activeCallId || !organizationId) return null
      return api.getAgentAssistSuggestions(organizationId, activeCallId)
    },
    enabled: !!activeCallId && !!organizationId,
  })

  const intentsQuery = useQuery({
    queryKey: ["ai-intents", activeCallId],
    queryFn: () => {
      if (!activeCallId || !organizationId) return null
      return api.getCallIntents(organizationId, activeCallId)
    },
    enabled: !!activeCallId && !!organizationId,
  })

  const metricsQuery = useQuery({
    queryKey: ["ai-metrics", activeCallId],
    queryFn: () => {
      if (!activeCallId || !organizationId) return null
      return api.getAIMetrics(organizationId, activeCallId)
    },
    enabled: !!activeCallId && !!organizationId,
  })

  const summary = summaryQuery.data?.summary
  const sentiments = sentimentQuery.data?.sentiments ?? []
  const suggestions = suggestionsQuery.data?.suggestions ?? []
  const intents = intentsQuery.data?.intents ?? []
  const metrics = metricsQuery.data?.metrics

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">AI Call Intelligence</h1>
          <p className="text-sm text-neutral-400 mt-1">Real-time AI-powered call analytics and agent assist</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Enter call ID..." value={activeCallId ?? ""} onChange={(e) => setActiveCallId(e.target.value || null)} className="w-64" />
          <Button variant="default" size="sm" onClick={() => setActiveCallId(activeCallId ?? "demo-call-id")}>Load Call</Button>
        </div>
      </div>

      {!activeCallId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Brain className="w-12 h-12 text-neutral-500 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-200 mb-2">AI Call Intelligence</h3>
            <p className="text-sm text-neutral-400 max-w-md">Enter a call ID to view AI-powered insights including sentiment analysis, call summaries, agent assist suggestions, and intent classifications.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-neutral-400"><Zap className="w-4 h-4" />Overall Sentiment</div><div className="mt-2 text-xl font-bold"><Badge variant={summary?.sentiment === "positive" ? "success" : summary?.sentiment === "negative" ? "danger" : "default"}>{summary?.sentiment ?? "N/A"}</Badge></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-neutral-400"><Target className="w-4 h-4" />Risk Level</div><div className="mt-2 text-xl font-bold"><Badge variant={summary?.riskLevel === "high" ? "danger" : summary?.riskLevel === "medium" ? "warning" : "success"}>{summary?.riskLevel ?? "N/A"}</Badge></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-neutral-400"><Lightbulb className="w-4 h-4" />AI Suggestions</div><div className="mt-2 text-xl font-bold">{suggestions.length}</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-neutral-400"><Brain className="w-4 h-4" />Interruptions</div><div className="mt-2 text-xl font-bold">{metrics?.interruptionCount ?? "N/A"}</div></CardContent></Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
              <TabsTrigger value="intents">Intents</TabsTrigger>
              <TabsTrigger value="assist">Agent Assist</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4" />AI Call Summary</CardTitle></CardHeader><CardContent>
                {summary ? (
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-200">{summary.summary}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><h4 className="text-xs font-semibold text-neutral-400 mb-2">Intent</h4><p className="text-sm text-neutral-200">{summary.intent ?? "N/A"}</p></div>
                      <div><h4 className="text-xs font-semibold text-neutral-400 mb-2">Risk Level</h4><Badge variant={summary.riskLevel === "high" ? "danger" : summary.riskLevel === "medium" ? "warning" : "success"}>{summary.riskLevel ?? "N/A"}</Badge></div>
                    </div>
                    {summary.keyTopics.length > 0 && (<div><h4 className="text-xs font-semibold text-neutral-400 mb-2">Key Topics</h4><div className="flex flex-wrap gap-2">{summary.keyTopics.map((topic) => <Badge key={topic} variant="default">{topic}</Badge>)}</div></div>)}
                    {summary.actionItems.length > 0 && (<div><h4 className="text-xs font-semibold text-neutral-400 mb-2">Action Items</h4><ul className="space-y-1">{summary.actionItems.map((item, i) => <li key={i} className="flex items-center gap-2 text-sm text-neutral-300"><CheckCircle className="w-3 h-3 text-green-400" />{item}</li>)}</ul></div>)}
                  </div>
                ) : (<p className="text-sm text-neutral-500">No AI summary available for this call.</p>)}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="sentiment">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Sentiment Analysis</CardTitle></CardHeader><CardContent>
                {sentiments.length > 0 ? (
                  <div className="space-y-3">
                    {sentiments.map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                        <div className="flex items-center gap-3"><Badge variant={s.sentiment === "positive" ? "success" : s.sentiment === "negative" ? "danger" : "default"}>{s.sentiment}</Badge><span className="text-xs text-neutral-400">{s.channel}</span></div>
                        <div className="flex items-center gap-2"><div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${s.confidence * 100}%` }} /></div><span className="text-xs text-neutral-300">{(s.confidence * 100).toFixed(0)}%</span></div>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-sm text-neutral-500">No sentiment data available yet.</p>)}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="intents">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-4 h-4" />Intent Classification</CardTitle></CardHeader><CardContent>
                {intents.length > 0 ? (
                  <div className="space-y-3">
                    {intents.map((intent) => (
                      <div key={intent.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                        <span className="text-sm font-medium text-neutral-200">{intent.intent}</span>
                        <div className="flex items-center gap-2"><div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${intent.confidence * 100}%` }} /></div><span className="text-xs text-neutral-300">{(intent.confidence * 100).toFixed(0)}%</span></div>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-sm text-neutral-500">No intent data available yet.</p>)}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="assist">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="w-4 h-4" />Agent Assist Suggestions</CardTitle></CardHeader><CardContent>
                {suggestions.length > 0 ? (
                  <div className="space-y-3">
                    {suggestions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                        <div className="flex items-center gap-3"><Badge variant={s.priority === "urgent" ? "danger" : s.priority === "high" ? "warning" : "default"}>{s.priority}</Badge><span className="text-sm text-neutral-200">{s.content}</span></div>
                         <Badge variant="info" className="text-xs">{s.suggestionType}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-sm text-neutral-500">No agent assist suggestions available yet.</p>)}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="metrics">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-4 h-4" />AI Call Metrics</CardTitle></CardHeader><CardContent>
                {metrics ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div><h4 className="text-xs font-semibold text-neutral-400 mb-1">Talk Ratio - Customer</h4><p className="text-xl font-bold text-neutral-200">{((metrics.talkRatioCustomer ?? 0) * 100).toFixed(1)}%</p></div>
                    <div><h4 className="text-xs font-semibold text-neutral-400 mb-1">Talk Ratio - Agent</h4><p className="text-xl font-bold text-neutral-200">{((metrics.talkRatioAgent ?? 0) * 100).toFixed(1)}%</p></div>
                    <div><h4 className="text-xs font-semibold text-neutral-400 mb-1">Interruptions</h4><p className="text-xl font-bold text-neutral-200">{metrics.interruptionCount ?? 0}</p></div>
                    <div><h4 className="text-xs font-semibold text-neutral-400 mb-1">Silence Duration</h4><p className="text-xl font-bold text-neutral-200">{metrics.silenceDurationSeconds ?? 0}s</p></div>
                    <div><h4 className="text-xs font-semibold text-neutral-400 mb-1">AI Response Latency</h4><p className="text-xl font-bold text-neutral-200">{metrics.aiResponseLatencyMs ?? 0}ms</p></div>
                    <div><h4 className="text-xs font-semibold text-neutral-400 mb-1">Sentiment Trend</h4><Badge variant={metrics.sentimentTrend === "improving" ? "success" : metrics.sentimentTrend === "declining" ? "danger" : "default"}>{metrics.sentimentTrend ?? "N/A"}</Badge></div>
                  </div>
                ) : (<p className="text-sm text-neutral-500">No metrics data available yet.</p>)}
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
