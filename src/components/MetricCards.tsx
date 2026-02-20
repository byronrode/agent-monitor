import type { Run } from '../lib/types'
import { runState } from '../lib/utils'

type Props = { runs: Run[] }

const fmtTokens = (n: number) => n.toLocaleString()

export function MetricCards({ runs }: Props) {
  const counts = {
    running: runs.filter((r) => runState(r) === 'running').length,
    quiet: runs.filter((r) => runState(r) === 'quiet').length,
    stalled: runs.filter((r) => runState(r) === 'stalled').length,
    dead: runs.filter((r) => runState(r) === 'dead').length,
    total: runs.length,
  }

  const tokens = runs.reduce(
    (acc, r) => {
      acc.input += r.inputTokens ?? 0
      acc.output += r.outputTokens ?? 0
      acc.total += r.totalTokens ?? ((r.inputTokens ?? 0) + (r.outputTokens ?? 0))
      if (r.inputTokens != null || r.outputTokens != null || r.totalTokens != null) acc.withData += 1
      return acc
    },
    { input: 0, output: 0, total: 0, withData: 0 }
  )

  const cards = [
    { label: 'Running', value: counts.running, tone: 'running' },
    { label: 'Quiet', value: counts.quiet, tone: 'quiet' },
    { label: 'Stalled', value: counts.stalled, tone: 'stalled' },
    { label: 'Dead', value: counts.dead, tone: 'dead' },
    { label: 'Total', value: counts.total, tone: 'total' },
  ]

  return (
    <>
      <div className="stats">
        {cards.map((c) => (
          <div className={`stat status-${c.tone}`} key={c.label}>
            <div className="label">{c.label}</div>
            <div className="value">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="stats token-stats">
        <div className="stat status-total">
          <div className="label">Window Input Tokens</div>
          <div className="value">{fmtTokens(tokens.input)}</div>
        </div>
        <div className="stat status-total">
          <div className="label">Window Output Tokens</div>
          <div className="value">{fmtTokens(tokens.output)}</div>
        </div>
        <div className="stat status-total">
          <div className="label">Window Total Tokens</div>
          <div className="value">{fmtTokens(tokens.total)}</div>
          <div className="subvalue">{tokens.withData} / {runs.length} runs reporting tokens</div>
        </div>
      </div>
    </>
  )
}
