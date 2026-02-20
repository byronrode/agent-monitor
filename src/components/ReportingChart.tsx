import { useMemo, useState } from 'react'
import type { Reporting } from '../lib/types'

const palette = ['#60a5fa','#34d399','#c084fc','#f59e0b','#ef4444','#14b8a6','#f97316','#eab308']

export function ReportingChart({ data }: { data?: Reporting }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const bars = useMemo(() => data?.series.runtimeSplitByAgent ?? [], [data])
  const agentIds = data?.agentIds ?? []
  const max = Math.max(1, ...bars.map((b) => b.agents.reduce((a, x) => a + x.runtimeMs, 0)))

  return (
    <div className="card">
      <div className="mb-3 topbar-title">Runtime by day (stacked by agent)</div>
      <div className="mb-3 flex flex-wrap gap-2">
        {agentIds.map((a, i) => (
          <button key={a} className="btn" onClick={() => setHidden((h) => ({ ...h, [a]: !h[a] }))}>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: palette[i % palette.length] }} />
            {hidden[a] ? `Show ${a}` : `Hide ${a}`}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {bars.map((d) => {
          let accum = 0
          const total = d.agents.filter((x) => !hidden[x.agentId]).reduce((a, x) => a + x.runtimeMs, 0)
          return (
            <div key={d.date}>
              <div className="mb-1 flex justify-between text-xs muted"><span>{d.date}</span><span>{Math.round(total / 60000)}m</span></div>
              <div className="relative h-7 overflow-hidden rounded" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                {d.agents.map((a, i) => {
                  if (hidden[a.agentId]) return null
                  const w = (a.runtimeMs / max) * 100
                  const left = (accum / max) * 100
                  accum += a.runtimeMs
                  return <div key={a.agentId} title={`${a.agentId}: ${Math.round(a.runtimeMs / 60000)}m, runs ${a.runCount}`} className="absolute inset-y-0" style={{ left: `${left}%`, width: `${w}%`, background: palette[i % palette.length] }} />
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
