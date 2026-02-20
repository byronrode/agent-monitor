import type { Reporting, RunDetail, RunsResponse } from './types'

const bases = ['','/agent-monitor']

async function api<T>(path: string): Promise<T> {
  for (const b of bases) {
    const res = await fetch(`${b}/api${path}`)
    if (res.ok) return res.json()
  }
  throw new Error(`API failed: ${path}`)
}

export const fetchAgents = () => api<string[]>('/agents')
export const fetchRuns = (params: URLSearchParams) => api<RunsResponse>(`/runs?${params.toString()}`)
export const fetchRunDetail = (runId: string) => api<RunDetail>(`/runs/${runId}`)
export const fetchReporting = (params: URLSearchParams) => api<Reporting>(`/reports/dashboard?${params.toString()}`)
