import type { Run } from '../lib/types'
import { runState } from '../lib/utils'

type Props = { runs: Run[] }

export function MetricCards({ runs }: Props) {
  const counts = {
    running: runs.filter((r) => runState(r) === 'running').length,
    quiet: runs.filter((r) => runState(r) === 'quiet').length,
    stalled: runs.filter((r) => runState(r) === 'stalled').length,
    dead: runs.filter((r) => runState(r) === 'dead').length,
    total: runs.length,
  }

  const cards = [
    { label: 'Running', value: counts.running },
    { label: 'Quiet', value: counts.quiet },
    { label: 'Stalled', value: counts.stalled },
    { label: 'Dead', value: counts.dead },
    { label: 'Total', value: counts.total },
  ]

  return <div className="stats">{cards.map((c) => <div className="stat" key={c.label}><div className="label">{c.label}</div><div className="value">{c.value}</div></div>)}</div>
}
