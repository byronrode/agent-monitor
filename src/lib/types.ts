export type RunStatus = 'running' | 'done' | 'failed' | 'timeout' | 'unknown'
export type RunState = 'running' | 'quiet' | 'stalled' | 'dead'

export type Run = {
  runId: string
  label: string
  agentId: string
  model: string
  status: RunStatus
  startedAt: number
  endedAt?: number
  runtimeMs: number
  timeoutSeconds?: number
  task: string
  sessionKey: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  lastHeartbeatAt?: number
  outcome?: { status?: string }
}

export type RunDetail = Run & {
  messages: Array<{
    role: string
    text: string
    timestamp?: number
    toolCalls?: Array<{ name?: string; arguments?: unknown; result?: unknown }>
  }>
}

export type RunsResponse = {
  items: Run[]
  total: number
  limit: number
  offset: number
}

export type Reporting = {
  windowDays: number
  totals: { runCount: number; runtimeMs: number; agentCount: number; totalTokens?: number }
  series: {
    runtimeTrend: Array<{ date: string; runtimeMs: number }>
    runtimeSplitByAgent: Array<{ date: string; agents: Array<{ agentId: string; runtimeMs: number; runCount: number }> }>
  }
  agentIds: string[]
}
