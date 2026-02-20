import { fmtDuration } from '../lib/utils'

type Props = { runs: number; runtimeMs: number; agents: number }

export function MetricCards({ runs, runtimeMs, agents }: Props) {
  const cards = [
    { label: 'Runs', value: runs.toLocaleString() },
    { label: 'Runtime', value: fmtDuration(runtimeMs) },
    { label: 'Agents', value: agents.toString() }
  ]
  return (
    <div className="metric-grid">
      {cards.map((c) => (
        <div className="card" key={c.label}>
          <div className="metric-label">{c.label}</div>
          <div className="metric-value">{c.value}</div>
        </div>
      ))}
    </div>
  )
}
