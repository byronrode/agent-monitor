import { fmtDuration } from '../lib/utils'

type Props = { runs: number; runtimeMs: number; agents: number }

export function MetricCards({ runs, runtimeMs, agents }: Props) {
  const cards = [
    { label: 'Runs', value: runs.toLocaleString() },
    { label: 'Runtime', value: fmtDuration(runtimeMs) },
    { label: 'Agents', value: agents.toString() }
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div className="card" key={c.label}>
          <div className="text-xs text-slate-500 dark:text-zinc-400">{c.label}</div>
          <div className="text-xl font-bold">{c.value}</div>
        </div>
      ))}
    </div>
  )
}
