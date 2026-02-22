import { useMemo, useState } from 'react'
import type { Reporting, ReportingAgentUsage } from '../lib/types'
import type { DateRange, Period } from '../lib/reporting'
import { stackedData, todayYmd } from '../lib/reporting'

const palette = ['#60a5fa', '#34d399', '#c084fc', '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#eab308', '#818cf8', '#22d3ee']

const formatNumber = (n: number) => new Intl.NumberFormat().format(Math.round(n || 0))

function valueForAgent(agent: ReportingAgentUsage, mode: 'tokens' | 'runs') {
  return mode === 'tokens' ? agent.totalTokens : agent.runCount
}

export function ReportingChart({
  data,
  period,
  onPeriodChange,
  range,
  onRangeChange,
  onPrevWeek,
  onNextWeek,
}: {
  data?: Reporting
  period: Period
  onPeriodChange: (p: Period) => void
  range: DateRange
  onRangeChange: (r: DateRange) => void
  onPrevWeek: () => void
  onNextWeek: () => void
}) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)
  const [leaderboardMode, setLeaderboardMode] = useState<'tokens' | 'runs'>('tokens')

  const bars = useMemo(() => stackedData(data, period, range), [data, period, range])
  const agentIds = useMemo(() => {
    const ids = new Set<string>()
    bars.forEach((b) => b.agents.forEach((a) => ids.add(a.agentId)))
    return [...ids]
  }, [bars])

  const pieData = data?.breakdowns?.agentUsagePie ?? []
  const allTime = data?.allTime
  const max = Math.max(1, ...bars.map((b) => b.agents.filter((a) => !hidden[a.agentId]).reduce((acc, a) => acc + a.totalTokens, 0)))

  const leaderboard = useMemo(() => {
    const rows = [...(data?.breakdowns?.leaderboard ?? [])]
    return rows.sort((a, b) => (leaderboardMode === 'tokens' ? b.totalTokens - a.totalTokens : b.runCount - a.runCount))
  }, [data, leaderboardMode])

  const pieTotal = Math.max(1, pieData.reduce((a, b) => a + b.totalTokens, 0))

  return (
    <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
      <div className="col-span-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Usage by period (stacked by agent)</div>
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
              <button key={p} className={`h-8 rounded-md border px-3 font-mono text-[0.7rem] ${period === p ? 'border-[var(--accent-active-border)] bg-[var(--accent-active-bg)] text-[var(--accent-active-text)]' : 'border-transparent text-[var(--text-3)]'}`} onClick={() => onPeriodChange(p)}>{p}</button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
              Start date
              <input type="date" max={todayYmd()} value={range.start} onChange={(e) => onRangeChange({ ...range, start: e.target.value })} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-[0.75rem] text-[var(--text)]" />
            </label>
            <label className="flex flex-col gap-1 text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
              End date
              <input type="date" max={todayYmd()} value={range.end} onChange={(e) => onRangeChange({ ...range, end: e.target.value })} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-[0.75rem] text-[var(--text)]" />
            </label>
          </div>
          {period === 'weekly' ? (
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
              <button className="h-8 rounded-md border border-transparent px-3 font-mono text-[0.7rem] text-[var(--text-2)] hover:border-[var(--border)]" onClick={onPrevWeek}>← prev week</button>
              <button className="h-8 rounded-md border border-transparent px-3 font-mono text-[0.7rem] text-[var(--text-2)] hover:border-[var(--border)]" onClick={onNextWeek}>next week →</button>
            </div>
          ) : null}
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {agentIds.map((a, i) => (
            <button key={a} className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[0.68rem]" onClick={() => setHidden((h) => ({ ...h, [a]: !h[a] }))}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: palette[i % palette.length], opacity: hidden[a] ? 0.4 : 1 }} />
              {a}
            </button>
          ))}
        </div>

        <div className="relative" onMouseLeave={() => setHover(null)}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-3">
            {bars.map((d) => {
              let accum = 0
              const total = d.agents.filter((x) => !hidden[x.agentId]).reduce((a, x) => a + x.totalTokens, 0)
              return (
                <div key={d.period} className="flex flex-col items-center gap-2">
                  <div className="font-mono text-[0.68rem] text-[var(--text-2)]">{formatNumber(total)}</div>
                  <div className="relative h-32 w-full max-w-[84px] overflow-hidden rounded border border-[var(--border)] bg-[var(--surface-3)]">
                    {d.agents.map((a, i) => {
                      if (hidden[a.agentId]) return null
                      const h = (a.totalTokens / max) * 100
                      const bottom = (accum / max) * 100
                      accum += a.totalTokens
                      return (
                        <div
                          key={a.agentId}
                          className="absolute inset-x-0"
                          style={{ bottom: `${bottom}%`, height: `${h}%`, background: palette[i % palette.length] }}
                          onMouseMove={(e) => setHover({ x: e.clientX + 8, y: e.clientY + 8, text: `${a.agentId} • ${formatNumber(a.totalTokens)} tokens • ${a.runCount} runs` })}
                        />
                      )
                    })}
                  </div>
                  <div className="font-mono text-[0.72rem] text-[var(--text-2)]">{d.period}</div>
                </div>
              )
            })}
          </div>
          {hover ? <div className="fixed z-[210] rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[0.7rem]" style={{ left: hover.x, top: hover.y }}>{hover.text}</div> : null}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 text-sm font-semibold">All-time token usage</div>
        <div className="grid grid-cols-3 gap-2 max-md:grid-cols-1">
          <Tile label="Input" value={formatNumber(allTime?.inputTokens || 0)} />
          <Tile label="Output" value={formatNumber(allTime?.outputTokens || 0)} />
          <Tile label="Total" value={formatNumber(allTime?.totalTokens || 0)} sub={`${formatNumber(allTime?.runCount || 0)} runs`} />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 text-sm font-semibold">All-time split by agent</div>
        <div className="grid grid-cols-[160px_1fr] items-center gap-3 max-md:grid-cols-1">
          <svg viewBox="0 0 42 42" className="h-40 w-40 -rotate-90 max-md:mx-auto">
            {(() => {
              let offset = 0
              return pieData.map((row, i) => {
                const pct = (row.totalTokens / pieTotal) * 100
                const dash = `${pct} ${100 - pct}`
                const el = <circle key={row.agentId} cx="21" cy="21" r="15.915" fill="transparent" stroke={palette[i % palette.length]} strokeWidth="6" strokeDasharray={dash} strokeDashoffset={-offset} />
                offset += pct
                return el
              })
            })()}
          </svg>
          <div className="space-y-1 text-xs">
            {pieData.map((row, i) => (
              <div key={row.agentId} className="flex items-center justify-between gap-2">
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: palette[i % palette.length] }} />{row.agentId}</span>
                <span className="text-[var(--text-3)]">{Math.round((row.totalTokens / pieTotal) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Leaderboard</div>
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            <button className={`h-8 rounded-md border px-3 font-mono text-[0.7rem] ${leaderboardMode === 'tokens' ? 'border-[var(--accent-active-border)] bg-[var(--accent-active-bg)] text-[var(--accent-active-text)]' : 'border-transparent text-[var(--text-3)]'}`} onClick={() => setLeaderboardMode('tokens')}>tokens</button>
            <button className={`h-8 rounded-md border px-3 font-mono text-[0.7rem] ${leaderboardMode === 'runs' ? 'border-[var(--accent-active-border)] bg-[var(--accent-active-bg)] text-[var(--accent-active-text)]' : 'border-transparent text-[var(--text-3)]'}`} onClick={() => setLeaderboardMode('runs')}>runs</button>
          </div>
        </div>
        <div className="space-y-2">
          {leaderboard.map((row, idx) => (
            <div key={row.agentId} className="grid grid-cols-[52px_1fr_auto] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
              <div className="font-mono text-[0.72rem] text-[var(--text-3)]">#{idx + 1}</div>
              <div className="text-[0.82rem]">{row.agentId}</div>
              <div className="font-mono text-[0.8rem]">{formatNumber(valueForAgent(row, leaderboardMode))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-l-[3px] border-l-[var(--blue)] border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="text-[0.7rem] uppercase tracking-[0.08em] text-[var(--text-3)]">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold">{value}</div>
      {sub ? <div className="font-mono text-[0.65rem] text-[var(--text-3)]">{sub}</div> : null}
    </div>
  )
}
