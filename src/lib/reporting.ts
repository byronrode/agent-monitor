import type { Reporting, ReportingAgentUsage } from './types'

export type Period = 'daily' | 'weekly' | 'monthly'

export type DateRange = {
  start: string
  end: string
}

const DAY_MS = 24 * 60 * 60 * 1000

const ymd = (d: Date) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayYmd = () => ymd(new Date())

export function clampRange(range: DateRange, maxDate = todayYmd()): DateRange {
  const start = range.start <= maxDate ? range.start : maxDate
  const endRaw = range.end <= maxDate ? range.end : maxDate
  const end = endRaw >= start ? endRaw : start
  return { start, end }
}

export function defaultRangeForPeriod(period: Period): DateRange {
  const now = new Date()
  const today = ymd(now)

  if (period === 'daily') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: ymd(start), end: today }
  }

  if (period === 'weekly') {
    const day = now.getDay() // Sun=0
    const mondayOffset = day === 0 ? -6 : 1 - day
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    return { start: ymd(weekStart), end: today }
  }

  const start = new Date(now.getFullYear(), 0, 1)
  return { start: ymd(start), end: today }
}

export function daysBetweenInclusive(start: string, end: string) {
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  return Math.max(1, Math.floor((e.getTime() - s.getTime()) / DAY_MS) + 1)
}

export function normalizeDailyUsage(items: Array<{ period: string; totalTokens: number; runCount: number; agents: ReportingAgentUsage[] }>, range: DateRange) {
  const byPeriod = new Map(items.map((item) => [item.period, item]))
  const agentIds = Array.from(new Set(items.flatMap((item) => item.agents.map((a) => a.agentId)))).sort()

  const out: Array<{ period: string; totalTokens: number; runCount: number; agents: ReportingAgentUsage[] }> = []
  const start = new Date(`${range.start}T00:00:00`)
  const end = new Date(`${range.end}T00:00:00`)

  for (let ts = start.getTime(); ts <= end.getTime(); ts += DAY_MS) {
    const key = ymd(new Date(ts))
    const current = byPeriod.get(key)
    if (current) {
      const agents = agentIds.map((aid) => current.agents.find((a) => a.agentId === aid) || ({ agentId: aid, runCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }))
      out.push({
        period: key,
        totalTokens: agents.reduce((acc, a) => acc + a.totalTokens, 0),
        runCount: agents.reduce((acc, a) => acc + a.runCount, 0),
        agents,
      })
    } else {
      const agents = agentIds.map((aid) => ({ agentId: aid, runCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }))
      out.push({ period: key, totalTokens: 0, runCount: 0, agents })
    }
  }

  return out
}

export function stackedData(data: Reporting | undefined, period: Period, range: DateRange) {
  const items = data?.series.usageStacked?.items ?? []
  if (period !== 'daily') return items
  return normalizeDailyUsage(items, range)
}
