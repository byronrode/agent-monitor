import { useMemo, useState } from 'react'
import type { Reporting, ReportingAgentUsage } from '../lib/types'

const palette = ['#60a5fa', '#34d399', '#c084fc', '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#eab308', '#818cf8', '#22d3ee']

type Period = 'daily' | 'weekly' | 'monthly'

const formatNumber = (n: number) => new Intl.NumberFormat().format(Math.round(n || 0))

function stackedData(data?: Reporting) {
  return data?.series.usageStacked?.items ?? []
}

function valueForAgent(agent: ReportingAgentUsage, mode: 'tokens' | 'runs') {
  return mode === 'tokens' ? agent.totalTokens : agent.runCount
}

export function ReportingChart({ data, period, onPeriodChange }: { data?: Reporting; period: Period; onPeriodChange: (p: Period) => void }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)
  const [leaderboardMode, setLeaderboardMode] = useState<'tokens' | 'runs'>('tokens')

  const bars = useMemo(() => stackedData(data), [data])
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
    <div className="report-grid">
      <div className="card report-card report-full">
        <div className="report-head">
          <div className="topbar-title">Usage by period (stacked by agent)</div>
          <div className="view-toggle">
            {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
              <button key={p} className={`control-btn ${period === p ? 'active' : ''}`} onClick={() => onPeriodChange(p)}>{p}</button>
            ))}
          </div>
        </div>

        <div className="legend-row">
          {agentIds.map((a, i) => (
            <button key={a} className="btn" onClick={() => setHidden((h) => ({ ...h, [a]: !h[a] }))}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: palette[i % palette.length], opacity: hidden[a] ? 0.4 : 1 }} />
              {a}
            </button>
          ))}
        </div>

        <div className="stacked-wrap" onMouseLeave={() => setHover(null)}>
          {bars.map((d) => {
            let accum = 0
            const total = d.agents.filter((x) => !hidden[x.agentId]).reduce((a, x) => a + x.totalTokens, 0)
            return (
              <div key={d.period} className="stack-row">
                <div className="stack-label">{d.period}</div>
                <div className="stack-bar">
                  {d.agents.map((a, i) => {
                    if (hidden[a.agentId]) return null
                    const w = (a.totalTokens / max) * 100
                    const left = (accum / max) * 100
                    accum += a.totalTokens
                    return (
                      <div
                        key={a.agentId}
                        className="stack-seg"
                        style={{ left: `${left}%`, width: `${w}%`, background: palette[i % palette.length] }}
                        onMouseMove={(e) => setHover({ x: e.clientX + 8, y: e.clientY + 8, text: `${a.agentId} • ${formatNumber(a.totalTokens)} tokens • ${a.runCount} runs` })}
                      />
                    )
                  })}
                </div>
                <div className="stack-value">{formatNumber(total)}</div>
              </div>
            )
          })}
          {hover ? <div className="chart-tip" style={{ left: hover.x, top: hover.y }}>{hover.text}</div> : null}
        </div>
      </div>

      <div className="card report-card">
        <div className="topbar-title mb-3">All-time token usage</div>
        <div className="stats token-stats">
          <div className="stat status-total"><div className="label">Input</div><div className="value">{formatNumber(allTime?.inputTokens || 0)}</div></div>
          <div className="stat status-total"><div className="label">Output</div><div className="value">{formatNumber(allTime?.outputTokens || 0)}</div></div>
          <div className="stat status-total"><div className="label">Total</div><div className="value">{formatNumber(allTime?.totalTokens || 0)}</div><div className="subvalue">{formatNumber(allTime?.runCount || 0)} runs</div></div>
        </div>
      </div>

      <div className="card report-card">
        <div className="topbar-title mb-3">All-time split by agent</div>
        <div className="pie-wrap">
          <svg viewBox="0 0 42 42" className="pie">
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
                <span className="muted">{Math.round((row.totalTokens / pieTotal) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card report-card">
        <div className="report-head">
          <div className="topbar-title">Leaderboard</div>
          <div className="view-toggle">
            <button className={`control-btn ${leaderboardMode === 'tokens' ? 'active' : ''}`} onClick={() => setLeaderboardMode('tokens')}>tokens</button>
            <button className={`control-btn ${leaderboardMode === 'runs' ? 'active' : ''}`} onClick={() => setLeaderboardMode('runs')}>runs</button>
          </div>
        </div>
        <div className="space-y-2">
          {leaderboard.map((row, idx) => (
            <div key={row.agentId} className="leader-row">
              <div className="leader-rank">#{idx + 1}</div>
              <div className="leader-id">{row.agentId}</div>
              <div className="leader-val">{formatNumber(valueForAgent(row, leaderboardMode))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
